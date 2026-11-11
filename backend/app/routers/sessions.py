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
    session = db.get(AppSession, session_id)
    if session is None or getattr(request.state, "session_created", False):
        return SessionDeleteResponse(deleted=0)

    db.delete(session)
    db.commit()
    request.state.session_deleted = True
    return SessionDeleteResponse(deleted=1)
