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
        while True:
            progress = state.training_status["progress"]
            if progress != last_progress:
                yield {
                    "event": "progress",
                    "data": json.dumps(state.training_status),
                }
                last_progress = progress

            if not state.training_status["is_training"] and progress >= 100:
                yield {"event": "complete", "data": json.dumps(state.training_status)}
                break
            if not state.training_status["is_training"] and 0 < progress < 100:
                yield {"event": "stopped", "data": json.dumps(state.training_status)}
                break
            if not state.training_status["is_training"] and progress == 0 and last_progress > -1:
                yield {"event": "idle", "data": json.dumps(state.training_status)}
                break

            await asyncio.sleep(0.5)

    return EventSourceResponse(event_generator())
