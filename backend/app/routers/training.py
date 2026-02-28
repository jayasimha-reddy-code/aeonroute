"""Training router — lifecycle management + SSE progress stream.

SSE stream emits multiplexed events with `type` discriminator (Override #3):
- "metric"  → training chart data (episode, reward, loss, epsilon)
- "log"     → LiveTerminal log messages
- "status"  → progress bar updates
Also emits legacy "progress", "complete", "stopped", "idle" named events for backward compat.
"""

from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse
import asyncio
import json
from backend.app.state import AppState, get_state
from backend.app.models.requests import TrainingConfig
from backend.app.models.responses import ok
from backend.app.services.training_service import TrainingService

router = APIRouter(prefix="/api", tags=["Training"])


@router.get("/training-status", summary="Training status")
async def get_training_status(request: Request, state: AppState = Depends(get_state)):
    return ok(state.training_status)


@router.post("/start-training", summary="Start training")
async def start_training(request: Request, config: TrainingConfig, state: AppState = Depends(get_state)):
    service = TrainingService(state)
    await service.start_training(config)
    return ok({"status": "training_started", "episodes": config.episodes})


@router.post("/stop-training", summary="Stop training")
async def stop_training(request: Request, state: AppState = Depends(get_state)):
    service = TrainingService(state)
    service.stop_training()
    return ok({"status": "training_stopped"})


@router.get("/training/stream", summary="Stream training progress via SSE")
async def training_stream(request: Request, state: AppState = Depends(get_state)):
    """Server-Sent Events endpoint — streams multiplexed training events.
    The stream stays open permanently (keeps EventSource alive without reconnect loops).
    A keep-alive comment ping is sent every 15s to prevent proxy/browser timeout.
    """
    async def event_generator():
        last_progress = -1
        last_loss_len = 0
        last_reward_len = 0
        last_sse_idx = 0
        ping_countdown = 0  # seconds until next keep-alive ping

        while True:
            # ── Respect client disconnect ──────────────────────
            if await request.is_disconnected():
                break

            status = state.training_status
            progress = status["progress"]
            loss_history = status.get("loss_history", [])
            reward_history = status.get("reward_history", [])
            sse_events = status.get("sse_events", [])
            current_loss_len = len(loss_history)
            current_reward_len = len(reward_history)
            current_sse_len = len(sse_events)

            has_new_data = (
                progress != last_progress
                or current_loss_len != last_loss_len
                or current_reward_len != last_reward_len
            )

            # ── Emit new typed (multiplexed) SSE events ─────────
            if current_sse_len > last_sse_idx:
                new_events = sse_events[last_sse_idx:current_sse_len]
                last_sse_idx = current_sse_len
                for evt in new_events:
                    yield {
                        "event": "typed",
                        "data": json.dumps(evt),
                    }

            # ── Emit legacy progress event ──────────────────────
            if has_new_data:
                status_slim = {k: v for k, v in status.items() if k not in ("loss_history", "reward_history", "sse_events")}
                new_loss_points = loss_history[last_loss_len:] if current_loss_len > last_loss_len else None
                new_reward_points = reward_history[last_reward_len:] if current_reward_len > last_reward_len else None
                yield {
                    "event": "progress",
                    "data": json.dumps({
                        **status_slim,
                        "new_loss_points": new_loss_points,
                        "new_reward_points": new_reward_points,
                    }),
                }
                last_progress = progress
                last_loss_len = current_loss_len
                last_reward_len = current_reward_len

            # ── Training finished ────────────────────────────────
            if not status["is_training"] and progress >= 100:
                status_slim = {k: v for k, v in status.items() if k not in ("loss_history", "reward_history", "sse_events")}
                yield {"event": "complete", "data": json.dumps(status_slim)}
                # DO NOT break — stay open so the client sees the complete event
                # and the stream reconnect-loop doesn't fire. Keep pinging.

            elif not status["is_training"] and 0 < progress < 100:
                status_slim = {k: v for k, v in status.items() if k not in ("loss_history", "reward_history", "sse_events")}
                yield {"event": "stopped", "data": json.dumps(status_slim)}

            # ── Keep-alive ping (every 15 s) ────────────────────
            ping_countdown -= 1
            if ping_countdown <= 0:
                yield {"comment": "ping"}   # SSE comment — keeps connection open
                ping_countdown = 30         # 30 × 0.5 s = 15 s

            await asyncio.sleep(0.5)

    return EventSourceResponse(event_generator())

