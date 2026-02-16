"""Training router — lifecycle management + SSE progress stream."""

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
    return ok({"status": "training_started"})


@router.post("/stop-training", summary="Stop training")
async def stop_training(request: Request, state: AppState = Depends(get_state)):
    service = TrainingService(state)
    service.stop_training()
    return ok({"status": "training_stopped"})


@router.get("/training/stream", summary="Stream training progress via SSE")
async def training_stream(request: Request, state: AppState = Depends(get_state)):
    """Server-Sent Events endpoint — streams training progress updates."""
    async def event_generator():
        last_progress = -1
        last_loss_len = 0
        last_reward_len = 0
        while True:
            status = state.training_status
            progress = status["progress"]
            loss_history = status.get("loss_history", [])
            reward_history = status.get("reward_history", [])
            current_loss_len = len(loss_history)
            current_reward_len = len(reward_history)
            has_new_data = (
                progress != last_progress
                or current_loss_len != last_loss_len
                or current_reward_len != last_reward_len
            )

            if has_new_data:
                status_slim = {k: v for k, v in status.items() if k not in ("loss_history", "reward_history")}
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

            if not status["is_training"] and progress >= 100:
                yield {"event": "complete", "data": json.dumps(status)}
                break
            if not status["is_training"] and 0 < progress < 100:
                yield {"event": "stopped", "data": json.dumps(status)}
                break
            if not status["is_training"] and progress == 0 and last_progress > -1:
                yield {"event": "idle", "data": json.dumps(status)}
                break

            await asyncio.sleep(0.5)

    return EventSourceResponse(event_generator())
