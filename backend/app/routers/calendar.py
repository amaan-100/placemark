"""Calendar export and deadline reminders.

The ICS download is the real tool call: it produces a standards-compliant
artifact the student's own calendar app consumes, with two alarms attached.
Reminders are derived from the same stored deadlines, so no extra table is
needed for either feature.
"""

import time

from fastapi import APIRouter, Response
from sqlalchemy import select

from ..deps import DbSession, SessionId
from ..errors import AppError
from ..models import Application
from ..schemas import ReminderListResponse, ReminderOut
from ..services.calendar import build_deadline_ics, slugify
from ..services.reminders import build_reminders, parse_deadline, summarize
from ..services.traces import record_run

router = APIRouter(prefix="/api", tags=["calendar"])


@router.get("/applications/{app_id}/deadline.ics")
def download_deadline_ics(
    app_id: int,
    db: DbSession,
    session_id: SessionId,
) -> Response:
    application = db.get(Application, app_id)
    if application is None or application.session_id != session_id:
        raise AppError(404, "application_not_found", "Application not found.")

    deadline = parse_deadline(application.deadline)
    if deadline is None:
        raise AppError(
            400,
            "deadline_missing",
            "Add a deadline to this application before exporting it.",
        )

    started = time.perf_counter()
    body = build_deadline_ics(
        application_id=application.id,
        session_id=session_id,
        title=application.title,
        company=application.company,
        deadline=deadline,
        url=application.url or "",
        status=application.status,
    )
    latency_ms = (time.perf_counter() - started) * 1000

    record_run(
        db,
        session_id,
        agent="calendar",
        action="export_ics",
        output={
            "application_id": application.id,
            "deadline": deadline.isoformat(),
            "alarm_days": [3, 1],
        },
        latency_ms=latency_ms,
    )

    filename = f"placemark-{slugify(application.company)}-{deadline.isoformat()}.ics"
    return Response(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/reminders", response_model=ReminderListResponse)
def list_reminders(db: DbSession, session_id: SessionId) -> ReminderListResponse:
    rows = list(
        db.scalars(
            select(Application)
            .where(Application.session_id == session_id)
            .order_by(Application.id.desc())
        )
    )
    items = build_reminders(rows)
    overdue, due_soon = summarize(items)
    return ReminderListResponse(
        items=[
            ReminderOut(
                application_id=item.application_id,
                title=item.title,
                company=item.company,
                deadline=item.deadline,
                days_left=item.days_left,
                kind=item.kind,
            )
            for item in items
        ],
        overdue=overdue,
        due_soon=due_soon,
        total=len(items),
    )
