# Accounts: cross-device sessions

Branch: `feat/accounts` (stacked on `main` @ `b6029e4`)
Date: 2026-11-11

The workspace was already session-scoped, but a session lived only in one
browser's `localStorage`. That made "no account needed" and "pick up where you
left off on another device" mutually exclusive. This branch adds accounts on top
of Neon Managed Better Auth without disturbing the anonymous path.

No child table changed. Every model (`resumes`, `jobs`, `applications`,
`interviews`, `agent_runs`, `audit_events`) was already keyed to
`sessions.id`, so ownership became a single nullable column on `sessions`.

---

## 1. Identity provider

**Neon Managed Better Auth** on branch `br-young-dream-bbvfh2xb`, database
`neondb`. Free tier: up to **60,000 MAU per project**, so no card is required.

- Schema: `neon_auth`
- Base URL: `https://ep-square-king-bb18hfwu.neonauth.c-15.us-east-1.aws.neon.tech/neondb/auth`
- JWKS: `.../auth/.well-known/jwks.json`
- Enabled: email + password (verification not required)
- Trusted origins: `http://127.0.0.1:5173`, `https://place-mark.vercel.app`
- Google OAuth is available as a shared provider and can be switched on without
  code changes.

### Token shape (verified against a real sign-up)

The access token is an **EdDSA** JWT. Critically:

| Claim | Value |
| --- | --- |
| `iss` | `https://<endpoint>.neonauth...neon.tech` — **origin only** |
| `aud` | same origin |
| `sub` | the auth user id |
| `email` | the account email |

The JWKS URL includes `/neondb/auth`, but `iss` and `aud` do **not**. The first
implementation compared them against the full base URL and every token was
rejected with `InvalidIssuerError`. `config.auth_issuer` / `config.auth_audience`
now derive the origin via `urlsplit`, and both can be overridden explicitly.

---

## 2. Data model

Two migrations, both applied:

`b7c1e4d92a10_accounts`
```
users            id (PK, = auth sub), email (unique), display_name,
                 created_at, last_login_at
sessions         + user_id  → users.id ON DELETE CASCADE, indexed
                 uq_sessions_one_per_user  UNIQUE(user_id) WHERE user_id IS NOT NULL
```

`c4f8a2d61b73_deleted_accounts`
```
deleted_accounts  user_id (PK), deleted_at
```

`user_id IS NULL` means an anonymous, browser-scoped workspace — exactly the
previous behaviour. The partial unique index leaves those rows alone.

### Why the tombstone exists

Verified live: after `DELETE /api/auth/account`, the client held a JWT that was
still cryptographically valid for ~15 minutes. The next request ran
`upsert_user`, found no row, and **recreated the account**. Deletion was
defeated.

`deleted_accounts` records the subject permanently. `upsert_user` refuses a
tombstoned subject, the middleware then treats the caller as anonymous, and
`/api/auth/me` returns 401. Covered by
`test_deleted_account_can_be_resurrected_by_a_live_token`.

---

## 3. Request resolution

`SessionMiddleware` decides the workspace before any handler runs:

1. Valid bearer token → the one session owned by that account (created on first
   sign-in).
2. Otherwise `X-Session-Id` → that anonymous workspace.
3. Otherwise a fresh UUID (`localStorage` + `pc_session` cookie).

Because the middleware needs `sessions.user_id` to satisfy a foreign key, the
`users` row is created **first**. Getting that order wrong produced
`sqlite3.IntegrityError: FOREIGN KEY constraint failed` on every first sign-in;
this is now `test_sign_in_creates_user_and_session`.

### Adopting anonymous progress

On first sign-in the browser still sends its anonymous `X-Session-Id`. If the
account has no workspace yet and that anonymous session is unowned, the server
sets `user_id` on it instead of creating a new one — the student keeps their
resume, drafts, and practice history. Verified live: upload anonymously → sign
in → `resume/latest` still returns `resume.pdf`.

Signing in on a second device sends no `X-Session-Id`, resolves to the same
owned session, and sees the same data. Verified live.

---

## 4. Deletion semantics (two distinct actions)

| Action | Endpoint | Effect |
| --- | --- | --- |
| Delete workspace data | `DELETE /api/session` | Erases resume, drafts, applications, interviews, traces. **Account survives**; a fresh empty workspace is created immediately and its id is echoed back. |
| Delete account | `DELETE /api/auth/account` | Erases the user; sessions cascade, which cascades every child row. Tombstone prevents resurrection. |

The cookie is cleared only in the anonymous case; a signed-in student stays
signed in with a clean workspace.

`frontend` reloads after a workspace wipe so every panel reads the new session,
and returns to the landing page after an account deletion.

---

## 5. Retention

`purge_stale_sessions` now deletes **only anonymous sessions**:

```sql
... WHERE last_seen_at < cutoff AND user_id IS NULL
```

Rationale: signing in is an explicit request to keep the data, and the student
has a delete button. A 30-day inactivity rule would otherwise silently destroy a
signed-up student's history. Covered by
`test_purge_never_removes_account_owned_sessions` (400-day-old account session
survives).

Landing copy was rewritten to match:

> No account needed to start. Without signing in, your resume lives in this
> browser and is deleted after 30 days of inactivity. Sign in and it is kept on
> every device until you delete it.

---

## 6. Frontend

- `src/lib/auth.ts` — `@neon/auth` 0.8.2 client. Tokens come from
  `getBetterAuthInstance().getSession()`; the React adapter instance has no
  `getSession` of its own.
- `src/api/client.ts` — attaches `Authorization: Bearer <jwt>` when signed in and
  still sends `X-Session-Id`, which is what enables adoption.
- `src/components/AuthDialog.tsx` — sign in / create account, client-side
  validation (8-char minimum), Escape and backdrop close, focus restore.
- `src/components/SessionTag.tsx` — shows the email when signed in, otherwise
  "No account needed". Blurred session id behind an eye toggle. Offers
  **Sign in to save progress** when anonymous, and shows **Delete my account**
  only when signed in.
- Landing header gained a real **Sign in** button (previously the only entry was
  the workspace).

### Soft prompt, not a gate

Anonymous visitors are never blocked. The account offer appears once, after a
resume is parsed — the first moment there is work worth keeping — via an
`authPrompted` ref so it does not nag.

If auth is not configured (`VITE_NEON_AUTH_URL` empty), `authClient` is `null`,
the dialog renders nothing, and the product behaves exactly as before.

---

## 7. Configuration

Backend (`backend/.env`, gitignored):
```
NEON_AUTH_BASE_URL=https://<endpoint>.neonauth.../neondb/auth
NEON_AUTH_JWKS_URL=https://<endpoint>.neonauth.../neondb/auth/.well-known/jwks.json
# optional overrides
# NEON_AUTH_ISSUER=
# NEON_AUTH_AUDIENCE=
```

Frontend (`frontend/.env`, gitignored):
```
VITE_NEON_AUTH_URL=https://<endpoint>.neonauth.../neondb/auth
```

`requirements.txt` gained `PyJWT[crypto]>=2.8,<3.0`. `.env.example` documents the
optional auth variables.

Deployment still needs these set in Render (backend) and Vercel
(`VITE_NEON_AUTH_URL`). Not done on this branch.

### Why `VITE_` must stay on `VITE_NEON_AUTH_URL`

Vercel shows a generic warning when a variable name starts with a public
framework prefix: *"Public prefixes expose values to the browser. If that's
safe, change the variable to Config."* **Do not rename this one.**

- In Vite, only `VITE_`-prefixed variables are injected into `import.meta.env`
  for browser code. Renaming it makes `src/lib/auth.ts` read `undefined`, and
  auth silently disables in production.
- The value is the Neon Auth base URL. It is an intentionally public endpoint
  — the browser must call it to sign in. It is the same class of value as a
  Supabase URL or a Clerk publishable key. It contains no credential.
- Verified by building with both values set and grepping the output bundle:
  the auth URL appears in `dist/assets/*.js` (expected), and `LLM_API_KEY`,
  `DATABASE_URL`, `npg_`, and `NEON_AUTH_JWKS_URL` do not.

The genuine secrets stay on Render only and never get a `VITE_` prefix:
`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `LLM_API_KEY`.

---

## 8. Verification

| Check | Result |
| --- | --- |
| `pytest` | **57 passed** (46 before + 11 account tests) |
| `npm run build` | clean |
| `npm run typecheck` | clean |
| Live Neon Auth sign-up → JWT → `/api/auth/me` | 200 |
| Cross-device (no `X-Session-Id`, token only) | same `session_id`, same resume |
| Anonymous → sign-in adoption | `session_id` preserved, resume intact |
| Delete workspace data | `deleted: 1`, account still valid, new empty session, resume gone |
| Delete account | user + sessions + children gone, `401` after, **no resurrection** |
| Retention purge | 400-day account session survives; stale anonymous removed |
| UI: landing copy, sign-in dialog, popover, mobile 390px | all pass |

Bugs found and fixed during verification (all now covered by tests):
1. FK violation on first sign-in (user row created after the session row).
2. Account resurrection via a still-valid token.
3. `iss`/`aud` compared against the base URL instead of the origin.
4. `get_optional_user` raising instead of returning `None` for a tombstoned user.

## Files

**Backend:** `app/config.py`, `app/deps.py`, `app/main.py`, `app/middleware.py`,
`app/models.py`, `app/routers/auth.py` (new), `app/routers/sessions.py`,
`app/schemas.py`, `app/services/auth.py` (new), `app/services/sessions.py`,
`migrations/versions/b7c1e4d92a10_accounts.py` (new),
`migrations/versions/c4f8a2d61b73_deleted_accounts.py` (new),
`tests/test_accounts.py` (new), `requirements.txt`, `.env.example`

**Frontend:** `package.json`, `src/api/client.ts`, `src/lib/auth.ts` (new),
`src/components/AuthDialog.tsx` (new), `src/components/SessionTag.tsx`,
`src/components/Workspace.tsx`, `src/components/Landing.tsx`

## Still open

- Set the auth env vars in Render and Vercel at deploy time.
- Optional: enable the shared Google provider in the Neon console.
- Merge-vs-adopt on sign-in is adopt-only; if an account already has a workspace,
  the browser's anonymous data is left orphaned rather than merged.
