# UX polish, privacy, and skill-grounding pass

Branch: `feat/ux-polish` (stacked on `feat/deadline-tracking`)
Date: 2026-11-11

This pass removes the friction and over-claiming we found while reviewing the live
product: the approval dialog's new product name, the agent-trace tag clutter, an
incorrect time unit, an unearned "anonymous" claim, a dead primary button, and a
skill extractor that could pick up skills the candidate does not actually have.

No database migration was required.

---

## 1. Approval dialog: no more typing ceremony

**Problem.** The dialog required typing `approve` to enable the primary button.
It also disabled that button until the draft had been edited, so an untouched
draft — the normal case — could not be approved at all. Two different rules
applied to the same button.

**Change** (`frontend/src/components/ApprovalDialog.tsx`)

- Removed the `type approve` input, its state, and the confirmation gating.
- Kept the acknowledgement checkbox — that is the meaningful signal.
- The primary action is now enabled as soon as the checkbox is ticked,
  regardless of whether anything was edited.
- Added a quiet hint when nothing changed: *"Nothing edited. Approving records
  your decision on the current draft."*
- Footer status reads `Ready to approve` / `Review, then record your decision`.
- Button labels: `Approve & record decision` (no edits), `Save & approve`
  (edits), `Save deadline` (approved + deadline only), `Save & re-approve`
  (approved + draft edits).

`frontend/src/components/Workspace.tsx` still short-circuits a deadline-only
change on an approved draft so it saves without re-approving.

---

## 2. Agent trace: tags removed, seconds not milliseconds

**Problem.** Every trace row carried an `AI` / `Fallback` / `System` pill. All
three per row was noise: `System` said almost nothing, and `AI` was redundant
next to the header's mode chip.

**Change**

- `frontend/src/components/TraceRail.tsx` — removed the mode pill entirely.
- `frontend/src/lib/agents.ts` — deleted `traceMode` and the `TraceMode` type.
- `frontend/src/utils.ts` — added `formatLatency()`: `0.8s`, `19.0s`, floor of
  `0.1s`, `—` for invalid values.
- Footer copy: "Latency is measured per action" → "Each step is timed."

The header chip showing the *current* system state remains; it describes the app
right now, not an individual step.

### Fallback is hidden, not removed

The deterministic path is deliberately retained as an unadvertised safety net. It
is the recovery route when the provider times out, rate-limits, or returns
malformed JSON — all likely on a free model under demo load. It is also what the
test suite exercises (`LLM_PROVIDER=disabled`). No user-facing copy mentions it.

---

## 3. Landing page copy and preview

`frontend/src/components/Landing.tsx`

| Before | After |
| --- | --- |
| `00 Submissions made for you` | `00 Auto-submissions, always zero` |
| `Works without AI — fallback mode included` | `Grounded in your resume — never invented.` |
| Commitment 3: `Fallback is first-class` | Commitment 3: `Every step is visible` |
| `Anonymous session. No accounts.` | `No account needed. Your resume is stored for this browser session only — deleted after 30 days of inactivity, or immediately when you delete it.` |
| Preview latencies `812 ms` / `1,204 ms` / `1,540 ms` | `0.8s` / `1.2s` / `1.5s` |
| Preview suffix `{ms} · AI` | `{ms}` |

Commitment 3 now describes what the product actually does: every action is
logged with what it did, how long it took, and whether AI was involved.

---

## 4. Session identity: hidden by default, deletable

**Problem.** The header printed the first eight characters of the session UUID
next to "Anonymous". It meant nothing to a student and exposed a stable
fingerprint.

**Change** — new `frontend/src/components/SessionTag.tsx`

- Header shows `No account needed`.
- A popover reveals the short id only when asked, and the id is **blurred** until
  the eye icon is pressed (`aria-expanded`, `aria-pressed`, descriptive labels).
- The popover contains a trash action: *Delete this session and its data*.
- Deletion is confirmed through the existing accessible `ConfirmDialog`, with an
  explicit irreversibility warning.
- On confirm: `DELETE /api/session`, clear `localStorage`, return to the landing
  page.
- Hidden below the `sm` breakpoint to protect header width.

`frontend/src/api/client.ts` gained `clearSessionId()` and `api.deleteSession()`.

---

## 5. Session retention and deletion (backend)

**Problem.** Sessions and their data lived forever. "Anonymous" also over-claimed:
the resume text and drafts are stored server-side.

- `backend/app/config.py` — `session_retention_days: int = 30`.
- `backend/app/services/sessions.py` (new) — `purge_stale_sessions(db, days)`
  deletes sessions whose `last_seen_at` predates the cutoff in a single bulk
  `DELETE`, so `ondelete="CASCADE"` removes children at the database level.
  `purge_configured(db)` applies the configured window.
- `backend/app/main.py` — purges once at startup (failure is logged, never blocks
  boot) and starts a 6-hour background loop that swallows its own errors and is
  cancelled cleanly on shutdown.
- `backend/app/routers/sessions.py` — `DELETE /api/session`: deletes the row,
  returns `{"deleted": n}`, and marks the request so the middleware clears the
  cookie instead of re-setting it.
- `backend/app/middleware.py` — when a delete occurred, the response drops the
  cookie and no `X-Session-Id` header is returned. It also records whether the
  middleware created the row, which is what lets an unknown session return
  `deleted: 0` instead of being silently re-created first.

Cascade already existed on every child table (`resumes`, `jobs`,
`applications`, `interviews`, `agent_runs`, `audit_events`, and
`interview_turns` via `interviews`), so no migration was needed.

---

## 6. Skills: only what the candidate actually has

Two defects, both real:

1. `extract_skills()` scanned the whole resume, so *"Interested in learning
   Kubernetes"* granted the `kubernetes` skill.
2. `_grounded_skills()` accepted an LLM suggestion when it appeared as a plain
   substring, so `java` matched `JavaScript` and `go` matched `Google`.

**Changes**

- `backend/app/tools.py`
  - `ASPIRATIONAL_MARKERS` + `non_aspirational_text()` drop aspirational clauses
    before extraction. Clause-level (not whole-line) stripping keeps a real skill
    listed on the same line as a goal.
  - `learning` is guarded against `machine/deep/reinforcement/active learning`.
  - `extract_skills()` now scans the filtered text.
- `backend/app/agents.py`
  - `_grounded_skills()` grounds against filtered text with a word-boundary regex
    (`(?<![a-z0-9])…(?![a-z0-9])`), matching the existing pattern style in
    `tools.py`, plus a 2-character minimum so `c` is rejected while `c++` passes.
  - `RESUME_SYSTEM` and the `ResumeAgent.analyze` prompt now state explicitly to
    include only current skills and ignore interests, goals, and things the
    candidate is learning or aspires to learn.

### Verified behaviour

| Case | Result |
| --- | --- |
| `Skills: Python, SQL, React` | `python, react, sql` |
| `Interested in learning Kubernetes and Go` | none |
| `Aspiring to become a Java developer` | none |
| `Built a Flask API with Python and deployed on AWS` | `python, flask, aws` |
| `Machine Learning project with TensorFlow` | `tensorflow, machine learning` (guard works) |
| LLM says `java`, resume says `JavaScript` | rejected |
| LLM says `go`, resume says `Google` | rejected |
| LLM says `react` + `c++` | both kept |
| One-character suggestion | rejected |

### On model choice

The fix is deterministic validation, not a bigger model. A stronger model reduces
hallucination rates but cannot guarantee grounding, and the check must exist
either way. `google/gemma-4-31b-it` behind requesty.ai is adequate for extraction
once output is validated this way; upgrading should be a last resort after
prompt and validation work.

---

## 7. Layout

- Trust section now has the same `border-t-2 border-ink` rule as the section above
  "The loop, in order", instead of floating without a divider.
- `#trust-title` gained `lg:max-w-4xl` + `text-balance`, so "Not a feature." no
  longer breaks mid-phrase on desktop while still wrapping on phones.

---

## Verification

| Check | Result |
| --- | --- |
| `pytest` (backend) | **46 passed** (29 pre-existing + 17 new) |
| `npm run build` | clean |
| `npm run typecheck` | clean |
| Layout: 390 / 768 / 1024 / 1440 | no horizontal overflow, sub-44px targets, copy and border checks |
| Session popover | opens, id blurred by default, eye reveals, trash opens confirm, cancel works |
| Session delete, live | data present → `deleted: 1` → dashboard empty; child rows at 0 |
| Delete unknown session | `deleted: 0` (no 500) |
| Retention purge | 31-day-old session removed, fresh one kept, children cascaded |
| Approve dialog | typed field gone; unedited draft approvable after checkbox; deadline edit enables Save |

## Files

**Backend:** `app/config.py`, `app/main.py`, `app/middleware.py`,
`app/routers/sessions.py`, `app/schemas.py`, `app/services/sessions.py` (new),
`app/tools.py`, `app/agents.py`, `tests/test_sessions.py` (new),
`tests/test_skills.py` (new)

**Frontend:** `api/client.ts`, `components/ApprovalDialog.tsx`,
`components/Landing.tsx`, `components/SessionTag.tsx` (new),
`components/TraceRail.tsx`, `components/Workspace.tsx`, `lib/agents.ts`,
`utils.ts`

## Still deferred

- Server-side `due_soon` / `overdue` counts in `DashboardResponse` (frontend
  computes them).
- Optional `apple-touch-icon.png` and `og:image` — the favicon itself needs no
  change for the rename.
