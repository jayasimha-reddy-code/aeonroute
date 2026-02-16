"""Middleware stack for the EV Routing API."""

import json
import logging
import time
import uuid
from contextvars import ContextVar
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from src.config import get_settings

# -- Correlation ID context --
_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


# -- Structured Logging --
class _StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": _request_id_ctx.get("-"),
        }
        if record.exc_info and record.exc_info[0]:
            log["exception"] = self.formatException(record.exc_info)
        for k in ("method", "path", "status", "duration_ms"):
            if hasattr(record, k):
                log[k] = getattr(record, k)
        return json.dumps(log, default=str)


_handler = logging.StreamHandler()
settings = get_settings()
if settings.log_format == "json":
    _handler.setFormatter(_StructuredFormatter())
else:
    _handler.setFormatter(logging.Formatter(
        "%(asctime)s  %(levelname)-8s  [%(request_id)s]  %(message)s",
        datefmt="%H:%M:%S",
        defaults={"request_id": "-"},
    ))

logging.basicConfig(level=logging.INFO, handlers=[_handler], force=True)
logger = logging.getLogger("ev_routing")


async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


async def request_logger(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    _request_id_ctx.set(request_id)

    if request.method in ("POST", "PUT", "PATCH"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > get_settings().max_body_size:
            return JSONResponse(
                status_code=413,
                content={"ok": False, "message": "Request body too large"},
            )

    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000

    response.headers["X-Response-Time"] = f"{elapsed_ms:.1f}ms"
    response.headers["X-Request-ID"] = request_id

    logger.info(
        "%s %s %s  %.0f ms",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(elapsed_ms, 1),
        },
    )
    return response


async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled error on %s %s", request.method, request.url.path,
        extra={"method": request.method, "path": request.url.path},
    )
    return JSONResponse(
        status_code=500,
        content={"ok": False, "message": "Internal server error"},
    )


def register_middleware(app: FastAPI):
    app.middleware("http")(security_headers_middleware)
    app.middleware("http")(request_logger)
    app.add_exception_handler(Exception, global_exception_handler)
