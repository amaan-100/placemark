import uuid

from fastapi import APIRouter, Request

from ..deps import CurrentSession, DbSession, SessionId
from ..models import AppSession
from ..schemas import SessionDeleteResponse, SessionResponse

router = APIRouter(prefix="/api/session", tags=["sessions"])


@router.get("", response_model=SessionResponse)
def get_session(session: CurrentSession) -> SessionResponse:
    return SessionResponse(session_id=session.id, created_at=session.created_at)


@router.delete("", response_model=SessionDeleteResponse)
def delete_session(
    request: Request,
    db: DbSession,
    session_id: SessionId,
) -> SessionDeleteResponse:
    """Erase this workspace's data.

    For a signed-in student the account survives: a fresh empty workspace is
    created immediately so the next request lands somewhere valid. Signing out
    of the account entirely is a separate action.
    """
    session = db.get(AppSession, session_id)
    if session is None or getattr(request.state, "session_created", False):
        return SessionDeleteResponse(deleted=0)

    owner_id = session.user_id
    db.delete(session)
    db.commit()

    if owner_id:
        fresh = AppSession(id=str(uuid.uuid4()), user_id=owner_id)
        db.add(fresh)
        db.commit()
        # Tell the middleware to hand the browser the new workspace id and keep
        # the session cookie pointed at real data.
        request.state.session_id = fresh.id
    else:
        request.state.session_deleted = True

    return SessionDeleteResponse(deleted=1)
