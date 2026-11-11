import logging
import time
import uuid
from collections import defaultdict, deque
from threading import Lock

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware

from .config import settings
from .db import SessionLocal
from .logging_config import request_id_var
from .models import AppSession, utcnow
from .services.auth import AuthError, auth_enabled, upsert_user, verify_token

logger = logging.getLogger(__name__)

HEALTH_PATHS = {"/api/health", "/healthz", "/readyz"}


def normalize_session_id(raw: str | None) -> str | None:
    if not raw:
        return None
    try:
        return str(uuid.UUID(raw.strip()))
    except (ValueError, AttributeError):
        return None


def _bearer_token(request: Request) -> str | None:
    header = request.headers.get("Authorization") or ""
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def _authenticated_user_id(request: Request) -> str | None:
    """Resolve the account behind a valid access token, or None.

    A bad/expired token must not break anonymous usage, so verification failure
    simply falls through to the browser session. Tokens are verified once here
    and the result is cached on the request for dependencies to reuse.
    """
    token = _bearer_token(request)
    if not token or not auth_enabled():
        return None
    try:
        claims = verify_token(token)
    except AuthError:
        return None
    request.state.auth_claims = claims
    # The session row has a foreign key to `users`, so the account row must
    # exist before the workspace can point at it on a first-ever sign-in.
    try:
        with SessionLocal() as db:
            upsert_user(db, claims)
    except AuthError:
        # Deleted account: treat the caller as anonymous rather than failing.
        return None
    except SQLAlchemyError:
        logger.exception("user_upsert_failed", extra={"user_id": claims.user_id})
        return None
    return claims.user_id


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = request_id
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration = round((time.perf_counter() - started) * 1000, 2)
            logger.exception(
                "request_failed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration,
                },
            )
            request_id_var.reset(token)
            raise

        duration = round((time.perf_counter() - started) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        if request.url.path not in HEALTH_PATHS:
            logger.info(
                "request",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration,
                },
            )
        request_id_var.reset(token)
        return response


class SessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        header_id = normalize_session_id(request.headers.get(settings.session_header_name))
        cookie_id = normalize_session_id(request.cookies.get(settings.session_cookie_name))
        user_id = _authenticated_user_id(request)

        # Signed in: the account owns exactly one workspace, so every device
        # resolves to the same session id. Otherwise fall back to the browser
        # session, minting one when this is a first visit.
        session_id: str | None = None
        created = False
        try:
            with SessionLocal() as db:
                if user_id:
                    session = db.scalar(
                        select(AppSession).where(AppSession.user_id == user_id)
                    )
                    if session is None:
                        # First sign-in for this account. If the browser already
                        # holds an anonymous workspace, adopt it so the student
                        # keeps their resume, drafts, and practice history.
                        adoptable = db.get(AppSession, header_id) if header_id else None
                        if adoptable is not None and adoptable.user_id is None:
                            adoptable.user_id = user_id
                            adoptable.last_seen_at = utcnow()
                            db.commit()
                            session = adoptable
                        else:
                            session = AppSession(id=str(uuid.uuid4()), user_id=user_id)
                            db.add(session)
                            created = True
                            db.commit()
                    else:
                        session.last_seen_at = utcnow()
                        db.commit()
                    session_id = session.id
                else:
                    session_id = header_id or cookie_id or str(uuid.uuid4())
                    session = db.get(AppSession, session_id)
                    if session is None:
                        db.add(AppSession(id=session_id))
                        created = True
                    else:
                        session.last_seen_at = utcnow()
                    db.commit()
        except SQLAlchemyError:
            logger.exception("session_upsert_failed", extra={"session_id": session_id})
            # Never let bookkeeping break the request: fall back to a usable id.
            if not session_id:
                session_id = header_id or cookie_id or str(uuid.uuid4())

        request.state.session_id = session_id
        request.state.user_id = user_id
        request.state.session_created = created

        response = await call_next(request)
        if getattr(request.state, "session_deleted", False):
            response.delete_cookie(settings.session_cookie_name)
            return response
        # A handler may replace the workspace (account data wipe) or the id may
        # have been resolved above; always echo the current one back.
        session_id = getattr(request.state, "session_id", session_id)
        response.headers[settings.session_header_name] = session_id
        response.set_cookie(
            settings.session_cookie_name,
            session_id,
            max_age=settings.session_max_age_seconds,
            httponly=True,
            samesite="lax",
            secure=settings.is_production,
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app) -> None:
        super().__init__(app)
        self._hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _limit_for(self, path: str) -> tuple[int, str]:
        if path == "/api/resume/upload":
            return settings.rate_limit_upload_requests, "upload"
        return settings.rate_limit_requests, "api"

    def _check(self, key: tuple[str, str], limit: int, window: int) -> float | None:
        now = time.monotonic()
        cutoff = now - window
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] < cutoff:
                hits.popleft()
            if len(hits) >= limit:
                return max(1.0, window - (now - hits[0]))
            hits.append(now)
            if len(self._hits) > 10_000:
                self._hits.clear()
        return None

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if not path.startswith("/api/") or path in HEALTH_PATHS:
            return await call_next(request)

        identity = getattr(request.state, "session_id", None) or (
            request.client.host if request.client else "anonymous"
        )
        limit, bucket = self._limit_for(path)
        retry_after = self._check(
            (identity, bucket),
            limit,
            settings.rate_limit_window_seconds,
        )
        if retry_after is not None:
            request_id = getattr(request.state, "request_id", None)
            body: dict = {
                "error": {
                    "code": "rate_limited",
                    "message": "Too many requests. Please wait and try again.",
                }
            }
            if request_id:
                body["request_id"] = request_id
            return JSONResponse(
                status_code=429,
                content=body,
                headers={"Retry-After": str(int(retry_after))},
            )
        return await call_next(request)
