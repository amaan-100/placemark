import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import SessionLocal, engine, run_migrations
from .errors import (
    AppError,
    app_error_handler,
    http_error_handler,
    unhandled_error_handler,
    validation_error_handler,
)
from .logging_config import configure_logging
from .middleware import (
    RateLimitMiddleware,
    RequestContextMiddleware,
    SessionMiddleware,
)
from .routers import (
    applications,
    auth,
    dashboard,
    health,
    interviews,
    jobs,
    resumes,
    sessions,
    traces,
)
from .services.sessions import purge_configured

logger = logging.getLogger("placement")

SESSION_PURGE_INTERVAL_SECONDS = 6 * 60 * 60


def _purge_sessions_once() -> int:
    with SessionLocal() as db:
        return purge_configured(db)


async def _session_purge_loop() -> None:
    while True:
        await asyncio.sleep(SESSION_PURGE_INTERVAL_SECONDS)
        try:
            count = _purge_sessions_once()
            logger.info("sessions_purged", extra={"count": count})
        except Exception:
            logger.exception("sessions_purge_failed")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging(settings.log_level)
    run_migrations()
    try:
        count = _purge_sessions_once()
        logger.info("sessions_purged", extra={"count": count})
    except Exception:
        logger.exception("sessions_purge_failed")
    logger.info("startup", extra={"environment": settings.environment})
    purge_task = asyncio.create_task(_session_purge_loop())
    try:
        yield
    finally:
        purge_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await purge_task
        engine.dispose()
        logger.info("shutdown")


app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    description="Approval-gated multi-agent placement assistant.",
    lifespan=lifespan,
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(SessionMiddleware)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-Id", "X-Request-ID"],
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(HTTPException, http_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, unhandled_error_handler)

for module in (
    health,
    auth,
    sessions,
    resumes,
    jobs,
    applications,
    interviews,
    dashboard,
    traces,
):
    app.include_router(module.router)


@app.get("/")
def root() -> dict:
    return {
        "name": settings.app_name,
        "version": app.version,
        "docs": "/docs",
        "health": "/api/health",
    }
