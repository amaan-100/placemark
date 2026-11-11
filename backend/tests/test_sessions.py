import uuid
from datetime import timedelta

from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import Application, AppSession, Job, Resume, utcnow
from app.services.sessions import purge_stale_sessions


def _counts(session_id: str) -> dict[str, int]:
    with SessionLocal() as db:
        return {
            "sessions": db.scalar(
                select(func.count()).select_from(AppSession).where(AppSession.id == session_id)
            )
            or 0,
            "resumes": db.scalar(
                select(func.count()).select_from(Resume).where(Resume.session_id == session_id)
            )
            or 0,
            "jobs": db.scalar(
                select(func.count()).select_from(Job).where(Job.session_id == session_id)
            )
            or 0,
            "applications": db.scalar(
                select(func.count())
                .select_from(Application)
                .where(Application.session_id == session_id)
            )
            or 0,
        }


def _upload(client, headers, sample_pdf):
    response = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.pdf", sample_pdf, "application/pdf")},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_delete_session_with_data(client, sample_pdf):
    session_id = str(uuid.uuid4())
    headers = {"X-Session-Id": session_id}
    _upload(client, headers, sample_pdf)

    deleted = client.delete("/api/session", headers=headers)
    assert deleted.status_code == 200, deleted.text
    assert deleted.json()["deleted"] == 1


def test_delete_session_removes_child_rows(client, sample_pdf):
    session_id = str(uuid.uuid4())
    headers = {"X-Session-Id": session_id}
    _upload(client, headers, sample_pdf)

    search = client.post("/api/jobs/search", headers=headers, json={"query": "python developer"})
    assert search.status_code == 200, search.text
    job_id = search.json()["jobs"][0]["id"]
    draft = client.post("/api/applications/draft", headers=headers, json={"job_id": job_id})
    assert draft.status_code == 201, draft.text

    assert _counts(session_id)["resumes"] == 1

    deleted = client.delete("/api/session", headers=headers)
    assert deleted.status_code == 200, deleted.text
    assert deleted.json()["deleted"] == 1

    assert _counts(session_id) == {
        "sessions": 0,
        "resumes": 0,
        "jobs": 0,
        "applications": 0,
    }


def test_delete_unknown_or_already_deleted_session_is_idempotent(client):
    session_id = str(uuid.uuid4())
    headers = {"X-Session-Id": session_id}

    assert client.get("/api/session", headers=headers).status_code == 200

    first = client.delete("/api/session", headers=headers)
    assert first.status_code == 200, first.text
    assert first.json()["deleted"] == 1

    second = client.delete("/api/session", headers=headers)
    assert second.status_code == 200, second.text
    assert second.json()["deleted"] == 0

    unknown = client.delete("/api/session", headers={"X-Session-Id": str(uuid.uuid4())})
    assert unknown.status_code == 200, unknown.text
    assert unknown.json()["deleted"] == 0


def test_purge_stale_sessions_removes_only_stale():
    stale_id = str(uuid.uuid4())
    fresh_id = str(uuid.uuid4())
    now = utcnow()

    with SessionLocal() as db:
        db.add(
            AppSession(
                id=stale_id,
                created_at=now - timedelta(days=31),
                last_seen_at=now - timedelta(days=31),
            )
        )
        db.add(AppSession(id=fresh_id, created_at=now, last_seen_at=now))
        db.commit()

        removed = purge_stale_sessions(db, 30)
        assert removed == 1

    assert _counts(stale_id)["sessions"] == 0
    assert _counts(fresh_id)["sessions"] == 1


def test_purge_stale_sessions_cascades_to_children():
    stale_id = str(uuid.uuid4())
    now = utcnow()

    with SessionLocal() as db:
        db.add(
            AppSession(
                id=stale_id,
                created_at=now - timedelta(days=40),
                last_seen_at=now - timedelta(days=40),
            )
        )
        db.add(
            Resume(
                session_id=stale_id,
                filename="old.pdf",
                text="Old resume text for a stale session.",
                facts={"skills": ["python"]},
            )
        )
        db.commit()

        assert _counts(stale_id)["resumes"] == 1

        removed = purge_stale_sessions(db, 30)
        assert removed == 1

    counts = _counts(stale_id)
    assert counts["sessions"] == 0
    assert counts["resumes"] == 0
