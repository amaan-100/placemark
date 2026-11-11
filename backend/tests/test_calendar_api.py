"""HTTP contract for the calendar export and reminder endpoints."""

import uuid


def _draft(client, headers, sample_pdf):
    upload = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.pdf", sample_pdf, "application/pdf")},
    )
    assert upload.status_code == 201, upload.text

    search = client.post(
        "/api/jobs/search",
        headers=headers,
        json={"query": "python developer"},
    )
    assert search.status_code == 200, search.text
    job = search.json()["jobs"][0]

    draft = client.post(
        "/api/applications/draft",
        headers=headers,
        json={"job_id": job["id"]},
    )
    assert draft.status_code == 201, draft.text
    return draft.json()["application_id"]


def test_ics_export_requires_a_deadline(client, headers, sample_pdf):
    app_id = _draft(client, headers, sample_pdf)
    # Mock listings ship a deadline, and the draft inherits it. Clear it so the
    # "no deadline" path is what actually gets exercised.
    cleared = client.patch(
        f"/api/applications/{app_id}",
        headers=headers,
        json={"deadline": None},
    )
    assert cleared.status_code == 200, cleared.text

    response = client.get(f"/api/applications/{app_id}/deadline.ics", headers=headers)
    assert response.status_code == 400, response.text
    assert response.json()["error"]["code"] == "deadline_missing"


def test_ics_export_returns_calendar_for_owned_application(client, headers, sample_pdf):
    app_id = _draft(client, headers, sample_pdf)
    patched = client.patch(
        f"/api/applications/{app_id}",
        headers=headers,
        json={"deadline": "2026-11-15"},
    )
    assert patched.status_code == 200, patched.text

    response = client.get(f"/api/applications/{app_id}/deadline.ics", headers=headers)
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/calendar")

    disposition = response.headers["content-disposition"]
    assert disposition.startswith("attachment;")
    assert disposition.rstrip('"').endswith(".ics")
    assert "2026-11-15" in disposition

    body = response.text
    assert "BEGIN:VCALENDAR" in body
    assert "DTSTART;VALUE=DATE:20261115" in body
    assert "TRIGGER:-P3D" in body
    assert "TRIGGER:-P1D" in body


def test_ics_export_is_recorded_as_an_agent_run(client, headers, sample_pdf):
    app_id = _draft(client, headers, sample_pdf)
    client.patch(
        f"/api/applications/{app_id}",
        headers=headers,
        json={"deadline": "2026-11-15"},
    )
    client.get(f"/api/applications/{app_id}/deadline.ics", headers=headers)

    traces = client.get("/api/traces", headers=headers)
    assert traces.status_code == 200, traces.text
    calendar_runs = [t for t in traces.json() if t["agent"] == "calendar"]
    assert calendar_runs, "the calendar tool call must appear in the trace"
    assert calendar_runs[0]["action"] == "export_ics"


def test_ics_export_rejects_another_session(client, headers, sample_pdf):
    app_id = _draft(client, headers, sample_pdf)
    client.patch(
        f"/api/applications/{app_id}",
        headers=headers,
        json={"deadline": "2026-11-15"},
    )

    other = {"X-Session-Id": str(uuid.uuid4())}
    response = client.get(f"/api/applications/{app_id}/deadline.ics", headers=other)
    assert response.status_code == 404, response.text


def test_ics_export_unknown_application(client, headers):
    response = client.get("/api/applications/999999/deadline.ics", headers=headers)
    assert response.status_code == 404, response.text


def test_reminders_empty_session(client, headers):
    body = client.get("/api/reminders", headers=headers).json()
    assert body == {"items": [], "overdue": 0, "due_soon": 0, "total": 0}


def test_reminders_report_deadlines_and_buckets(client, headers, sample_pdf):
    first = _draft(client, headers, sample_pdf)
    client.patch(
        f"/api/applications/{first}",
        headers=headers,
        json={"deadline": "2026-11-15"},
    )

    body = client.get("/api/reminders", headers=headers).json()
    assert body["total"] == 1
    item = body["items"][0]
    assert item["application_id"] == first
    assert item["deadline"] == "2026-11-15"
    assert item["kind"] in {"overdue", "today", "soon", "later"}
    assert isinstance(item["days_left"], int)
    assert body["overdue"] + body["due_soon"] >= 0


def test_reminders_exclude_undated_applications(client, headers, sample_pdf):
    app_id = _draft(client, headers, sample_pdf)
    # Mock listings carry a deadline; remove it to prove undated rows are omitted.
    client.patch(
        f"/api/applications/{app_id}",
        headers=headers,
        json={"deadline": None},
    )

    body = client.get("/api/reminders", headers=headers).json()
    assert body["total"] == 0
    assert body["items"] == []


def test_reminders_are_session_scoped(client, headers, sample_pdf):
    app_id = _draft(client, headers, sample_pdf)
    client.patch(
        f"/api/applications/{app_id}",
        headers=headers,
        json={"deadline": "2026-11-15"},
    )

    other = {"X-Session-Id": str(uuid.uuid4())}
    body = client.get("/api/reminders", headers=other).json()
    assert body["total"] == 0
