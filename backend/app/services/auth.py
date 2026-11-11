"""Verify Managed Better Auth access tokens and map them to local users."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import lru_cache

import jwt
from jwt import PyJWKClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..config import settings
from ..models import AppSession, DeletedAccount, User, utcnow

logger = logging.getLogger(__name__)


class AuthError(Exception):
    """Raised when an access token cannot be trusted."""


@dataclass(frozen=True)
class AuthClaims:
    user_id: str
    email: str
    display_name: str | None


@lru_cache(maxsize=1)
def _jwks_client(url: str) -> PyJWKClient:
    # Caches fetched signing keys in-process; PyJWKClient refreshes on miss.
    return PyJWKClient(url, cache_keys=True, lifespan=300)


def auth_enabled() -> bool:
    return bool(settings.neon_auth_jwks_url)


def verify_token(token: str) -> AuthClaims:
    """Validate the JWT signature and issuer, then return its identity claims."""
    if not auth_enabled():
        raise AuthError("Authentication is not configured.")

    try:
        signing_key = _jwks_client(settings.neon_auth_jwks_url).get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256", "EdDSA"],
            audience=settings.auth_audience or None,
            issuer=settings.auth_issuer or None,
            options={"verify_aud": bool(settings.auth_audience)},
        )
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid or expired access token.") from exc
    except Exception as exc:  # network/key retrieval problems
        logger.warning("jwks_lookup_failed", extra={"error": type(exc).__name__})
        raise AuthError("Unable to verify the access token right now.") from exc

    subject = payload.get("sub")
    email = payload.get("email")
    if not isinstance(subject, str) or not subject:
        raise AuthError("Access token is missing a subject.")
    if not isinstance(email, str) or "@" not in email:
        raise AuthError("Access token is missing a usable email claim.")

    name = payload.get("name")
    return AuthClaims(
        user_id=subject,
        email=email.strip().lower(),
        display_name=name if isinstance(name, str) and name.strip() else None,
    )


def is_deleted(db: Session, user_id: str) -> bool:
    return db.get(DeletedAccount, user_id) is not None


def upsert_user(db: Session, claims: AuthClaims) -> User:
    """Create or refresh the local user row for these verified claims."""
    if is_deleted(db, claims.user_id):
        raise AuthError("This account was deleted.")

    user = db.get(User, claims.user_id)
    if user is not None:
        user.email = claims.email
        if claims.display_name:
            user.display_name = claims.display_name
        user.last_login_at = utcnow()
        db.commit()
        db.refresh(user)
        return user

    # No row under this subject. If the email is already registered under a
    # different subject, re-key that row instead of creating a duplicate — this
    # preserves every session and all of their data.
    existing = db.scalar(select(User).where(User.email == claims.email))
    if existing is not None:
        if is_deleted(db, existing.id):
            raise AuthError("This account was deleted.")
        db.execute(
            update(AppSession)
            .where(AppSession.user_id == existing.id)
            .values(user_id=claims.user_id)
        )
        db.execute(
            update(User).where(User.id == existing.id).values(id=claims.user_id)
        )
        db.flush()
        user = db.get(User, claims.user_id)
    else:
        user = User(
            id=claims.user_id,
            email=claims.email,
            display_name=claims.display_name,
        )
        db.add(user)

    user.email = claims.email
    if claims.display_name:
        user.display_name = claims.display_name
    user.last_login_at = utcnow()
    db.commit()
    db.refresh(user)
    return user
