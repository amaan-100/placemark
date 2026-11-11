from datetime import timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from ..config import settings
from ..models import AppSession, utcnow


def purge_stale_sessions(db: Session, days: int) -> int:
    cutoff = utcnow() - timedelta(days=days)
    result = db.execute(delete(AppSession).where(AppSession.last_seen_at < cutoff))
    db.commit()
    return result.rowcount or 0


def purge_configured(db: Session) -> int:
    return purge_stale_sessions(db, settings.session_retention_days)
