from fastapi import APIRouter, Response

from ..config import settings
from ..deps import CurrentUser, DbSession, OptionalUser
from ..models import DeletedAccount, User
from ..schemas import AuthStatusResponse, AuthUserResponse, SessionDeleteResponse
from ..services.auth import auth_enabled

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(user: User) -> AuthUserResponse:
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        created_at=user.created_at,
    )


@router.get("/config", response_model=AuthStatusResponse)
def auth_status(user: OptionalUser) -> AuthStatusResponse:
    """Whether accounts are available, and who is signed in if anyone."""
    return AuthStatusResponse(
        enabled=auth_enabled(),
        user=_user_out(user) if user is not None else None,
    )


@router.get("/me", response_model=AuthUserResponse)
def current_user(user: CurrentUser) -> AuthUserResponse:
    return _user_out(user)


@router.delete("/account", response_model=SessionDeleteResponse)
def delete_account(
    user: CurrentUser,
    db: DbSession,
    response: Response,
) -> SessionDeleteResponse:
    """Delete the account and every workspace it owns.

    Sessions cascade to resumes, jobs, applications, interviews, agent runs,
    and audit events, so this is a complete erasure. A tombstone is left behind
    so the still-valid access token cannot recreate the account on the next
    request.
    """
    db.add(DeletedAccount(user_id=user.id))
    db.delete(user)
    db.commit()
    response.delete_cookie(settings.session_cookie_name)
    return SessionDeleteResponse(deleted=1)
