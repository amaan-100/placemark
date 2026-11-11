from datetime import timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from ..config import settings
from ..models import AppSession, utcnow


def purge_stale_sessions(db: Session, days: int) -> int:
    """Delete abandoned anonymous workspaces.

    Account-owned sessions are never purged: signing in is an explicit request
    to keep the data, and the student deletes it themselves. Only browser-scoped
    sessions with no owner are subject to inactivity cleanup.
    """
    cutoff = utcnow() - timedelta(days=days)
    result = db.execute(
        delete(AppSession).where(
            AppSession.last_seen_at < cutoff,
            AppSession.user_id.is_(None),
        )
    )
    db.commit()
    return result.rowcount or 0


def purge_configured(db: Session) -> int:
    return purge_stale_sessions(db, settings.session_retention_days)
