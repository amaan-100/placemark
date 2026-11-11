# Phase 8 — Agent activity collapse + approval queue delete/sections

## 1. Agent activity — collapsible recent list
**Problem:** the panel grew unbounded as runs piled up, pushing the page down.

**Change (`TracePanel.tsx`):** show the 4 most recent runs by default. When there are
more, a full-width "Show N older runs" toggle expands the list; "Show less" collapses it.
A chevron rotates to signal state (`aria-expanded` set). Newest-first order is unchanged.

## 2. Approval queue — delete drafts + grouped sections
**Backend**
- New endpoint `DELETE /api/applications/{app_id}` in `routers/applications.py`.
  - Session-scoped (404 if not owned), records an `application_deleted` audit event
    (status/title/company) before removing the row, returns `{ "deleted": 1 }`.
- New schema `ApplicationDeleteResponse` in `schemas.py`.
- New test `test_application_can_be_deleted` (deletes, verifies list is empty, repeated
  delete → 404, cross-session delete → 404, dashboard counters reset). Suite: **22 passed**.

**Frontend**
- `types.ts` → `ApplicationDeleteResponse`; `client.ts` → `api.deleteApplication(id)`.
- `Icon.tsx` → new `trash` icon.
- `ApplicationsPanel.tsx` rewritten: drafts grouped into **Needs review** /
  **Approved** / **Other** sections (each with a count), plus a red **Delete** button per
  card. Empty groups are hidden.
- `App.tsx` → `deletingApplicationId` state + `handleDeleteApplication` (confirm dialog →
  delete → refresh applications/dashboard/traces → toast; closes the modal if the deleted
  draft was open).
- `style.css` → `.application-sections`, `.application-section-head`, `.application-buttons`,
  `.application-delete`, `.trace-toggle`, `.trace-toggle-icon`.

## Verification
- `pytest -q` → 22 passed.
- Live DELETE: draft created → delete 200 `{deleted:1}` → list empty → repeat 404.
- `npm run build` → tsc clean + vite build OK.
- Dev server module fetch confirms all new code is served (no stale cache this time).

## Note
The backend auto-reload (`uvicorn --reload`) died once mid-edit; it was restarted and is
healthy on `http://127.0.0.1:8000`. If the UI ever looks stale, restart the dev server and
hard-refresh (Ctrl+Shift+R) — the file watcher has failed before on Windows.
