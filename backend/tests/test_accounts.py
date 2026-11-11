"""Account ownership, cross-device continuity, and tenancy isolation.

The JWT signature check is exercised in `test_auth_token.py`; these tests patch
`verify_token` so they can drive the middleware with deterministic identities.
"""

import uuid
from datetime import timedelta

import pytest
from sqlalchemy import func, select

from app import middleware
from app.db import SessionLocal
from app.models import AppSession, Application, Resume, User, utcnow
from app.services.auth import AuthClaims
from app.services.sessions import purge_stale_sessions


def _claims(user_id: str, email: str) -> AuthClaims:
    return AuthClaims(user_id=user_id, email=email, display_name=None)


@pytest.fixture
def sign_in(monkeypatch):
    """Return a headers-builder that authenticates as an arbitrary user."""

    def _sign_in(user_id: str, email: str) -> dict[str, str]:
        claims = _claims(user_id, email)

        def fake_verify(token: str):
            if token == "good":
                return claims
            raise middleware.AuthError("bad token")

        monkeypatch.setattr(middleware, "verify_token", fake_verify)
        monkeypatch.setattr(middleware, "auth_enabled", lambda: True)
        return {"Authorization": "Bearer good"}

    yield _sign_in


def _upload(client, headers, sample_pdf):
    response = client.post(
        "/api/resume/upload",
        headers=headers,
        files={"file": ("resume.pdf", sample_pdf, "application/pdf")},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_auth_config_is_available_to_anonymous_visitors(client):
    """The config endpoint must never require a token; it only reports state."""
    body = client.get("/api/auth/config").json()
    assert "enabled" in body
    assert body["user"] is None, "an anonymous caller must not be attributed a user"


def test_sign_in_creates_user_and_session(client, sign_in):
    uid = str(uuid.uuid4())
    headers = sign_in(uid, "student@example.com")

    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200, me.text
    assert me.json()["email"] == "student@example.com"
    assert me.json()["id"] == uid

    with SessionLocal() as db:
        assert db.get(User, uid) is not None
        owned = db.scalar(select(AppSession).where(AppSession.user_id == uid))
        assert owned is not None


def test_anonymous_workspace_is_adopted_on_first_sign_in(client, sample_pdf, sign_in):
    anon_id = str(uuid.uuid4())
    anon_headers = {"X-Session-Id": anon_id}
    _upload(client, anon_headers, sample_pdf)

    # The real client keeps sending its anonymous X-Session-Id alongside the
    # bearer token, which is how the server knows which workspace to adopt.
    headers = {**sign_in(str(uuid.uuid4()), "adopter@example.com"), "X-Session-Id": anon_id}
    client.get("/api/auth/me", headers=headers)

    with SessionLocal() as db:
        session = db.get(AppSession, anon_id)
        assert session is not None
        assert session.user_id is not None, "anonymous workspace should be adopted"

    # The resume survived the sign-in.
    latest = client.get("/api/resume/latest", headers=headers)
    assert latest.status_code == 200, latest.text

    client.delete("/api/session", headers=headers)


def test_same_account_gets_same_workspace_from_another_device(client, sample_pdf, sign_in):
    uid = str(uuid.uuid4())
    email = "twodevices@example.com"

    device_a = sign_in(uid, email)
    _upload(client, device_a, sample_pdf)
    sid_a = client.get("/api/session", headers=device_a).json()["session_id"]

    # A second browser sends no X-Session-Id at all, only the token.
    device_b = sign_in(uid, email)
    sid_b = client.get("/api/session", headers=device_b).json()["session_id"]

    assert sid_a == sid_b
    latest = client.get("/api/resume/latest", headers=device_b)
    assert latest.status_code == 200, "second device should see the first device's resume"

    client.delete("/api/session", headers=device_a)


def test_two_accounts_are_isolated(client, sample_pdf, sign_in):
    alice = sign_in(str(uuid.uuid4()), "alice@example.com")
    _upload(client, alice, sample_pdf)

    bob = sign_in(str(uuid.uuid4()), "bob@example.com")
    bob_latest = client.get("/api/resume/latest", headers=bob)
    assert bob_latest.status_code == 404
    assert client.get("/api/dashboard", headers=bob).json()["applications"] == 0

    client.delete("/api/session", headers=alice)
    client.delete("/api/session", headers=bob)


def test_bad_token_falls_back_to_anonymous(client):
    headers = {
        "Authorization": "Bearer nonsense",
        "X-Session-Id": str(uuid.uuid4()),
    }
    assert client.get("/api/health", headers=headers).status_code == 200
    assert client.get("/api/auth/config", headers=headers).json()["user"] is None


def test_deleting_session_keeps_account_and_resets_workspace(client, sample_pdf, sign_in):
    uid = str(uuid.uuid4())
    headers = sign_in(uid, "keepaccount@example.com")
    _upload(client, headers, sample_pdf)

    before = client.get("/api/session", headers=headers).json()["session_id"]
    deleted = client.delete("/api/session", headers=headers)
    assert deleted.status_code == 200, deleted.text
    assert deleted.json()["deleted"] == 1

    after = client.get("/api/session", headers=headers).json()["session_id"]
    assert after != before, "a fresh workspace replaces the wiped one"

    with SessionLocal() as db:
        assert db.get(User, uid) is not None, "account must survive data deletion"
        assert db.get(AppSession, before) is None
        assert db.get(AppSession, after) is not None

    # Data is genuinely gone.
    assert client.get("/api/resume/latest", headers=headers).status_code == 404

    client.delete("/api/session", headers=headers)


def test_delete_account_removes_everything(client, sample_pdf, sign_in):
    uid = str(uuid.uuid4())
    headers = sign_in(uid, "erase@example.com")
    _upload(client, headers, sample_pdf)

    with SessionLocal() as db:
        sid = db.scalar(select(AppSession.id).where(AppSession.user_id == uid))

    response = client.delete("/api/auth/account", headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["deleted"] == 1

    with SessionLocal() as db:
        assert db.get(User, uid) is None
        assert db.get(AppSession, sid) is None
        assert (
            db.scalar(
                select(func.count()).select_from(Resume).where(Resume.session_id == sid)
            )
            == 0
        )

    # Subsequent calls with the same token behave as anonymous, not 500.
    assert client.get("/api/auth/config", headers=headers).status_code == 200


def test_purge_never_removes_account_owned_sessions():
    uid = str(uuid.uuid4())
    sid = str(uuid.uuid4())
    old = utcnow() - timedelta(days=400)

    with SessionLocal() as db:
        db.add(User(id=uid, email=f"{uid}@example.com", created_at=old, last_login_at=old))
        db.commit()
        db.add(AppSession(id=sid, user_id=uid, created_at=old, last_seen_at=old))
        db.commit()

        purge_stale_sessions(db, 30)

        assert db.get(AppSession, sid) is not None, "account data outlives the 30-day window"

    with SessionLocal() as db:
        session = db.get(AppSession, sid)
        if session is not None:
            db.delete(session)
        user = db.get(User, uid)
        if user is not None:
            db.delete(user)
        db.commit()


def test_application_scoped_to_owner_after_sign_in(client, sample_pdf, sign_in):
    uid = str(uuid.uuid4())
    headers = sign_in(uid, "owner@example.com")
    _upload(client, headers, sample_pdf)

    search = client.post("/api/jobs/search", headers=headers, json={"query": "python developer"})
    assert search.status_code == 200, search.text
    job_id = search.json()["jobs"][0]["id"]
    draft = client.post("/api/applications/draft", headers=headers, json={"job_id": job_id})
    assert draft.status_code == 201, draft.text

    with SessionLocal() as db:
        sid = db.scalar(select(AppSession.id).where(AppSession.user_id == uid))
        submitted = draft.json()["application_id"]
        row = db.get(Application, submitted)
        assert row is not None and row.session_id == sid

    client.delete("/api/session", headers=headers)

def test_deleted_account_cannot_be_resurrected_by_a_live_token(client, sign_in):
    """A still-valid access token must not recreate a deleted account."""
    uid = str(uuid.uuid4())
    email = "ghost@example.com"
    headers = sign_in(uid, email)

    assert client.get("/api/auth/me", headers=headers).status_code == 200
    assert client.delete("/api/auth/account", headers=headers).status_code == 200

    # The token is still cryptographically valid, but the account is gone.
    again = client.get("/api/auth/config", headers=headers)
    assert again.status_code == 200
    assert again.json()["user"] is None, "deleted account must not be recreated"

    assert client.get("/api/auth/me", headers=headers).status_code == 401

    with SessionLocal() as db:
        assert db.get(User, uid) is None
        assert db.scalar(select(AppSession).where(AppSession.user_id == uid)) is None
