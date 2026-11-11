from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from .db import get_db
from .errors import AppError
from .models import AppSession, User
from .services.auth import AuthClaims, AuthError, upsert_user

DbSession = Annotated[Session, Depends(get_db)]


def get_session_id(request: Request) -> str:
    session_id = getattr(request.state, "session_id", None)
    if not session_id:
        raise AppError(500, "session_missing", "Session context is unavailable.")
    return session_id


SessionId = Annotated[str, Depends(get_session_id)]


def get_current_session(db: DbSession, session_id: SessionId) -> AppSession:
    session = db.get(AppSession, session_id)
    if session is None:
        session = AppSession(id=session_id)
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


CurrentSession = Annotated[AppSession, Depends(get_current_session)]


def get_auth_claims(request: Request) -> AuthClaims | None:
    return getattr(request.state, "auth_claims", None)


AuthClaimsDep = Annotated[AuthClaims | None, Depends(get_auth_claims)]


def require_user(
    db: DbSession,
    claims: AuthClaimsDep,
) -> User:
    """Resolve the signed-in account, or refuse.

    Anonymous visitors are rejected here; every other endpoint keeps working
    without an account.
    """
    if claims is None:
        raise AppError(401, "auth_required", "Sign in to continue.")
    try:
        return upsert_user(db, claims)
    except AuthError as exc:
        raise AppError(401, "auth_required", str(exc)) from exc


def get_optional_user(
    db: DbSession,
    claims: AuthClaimsDep,
) -> User | None:
    """Resolve the account when signed in, otherwise None (never raises)."""
    if claims is None:
        return None
    try:
        return upsert_user(db, claims)
    except AuthError:
        # Deleted account, or a token that no longer maps to a live user.
        return None


CurrentUser = Annotated[User, Depends(require_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
