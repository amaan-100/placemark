# Multi-turn Interview + Weak-area Memory — Implementation Plan

Status: in progress
Branch: `feature/multiturn-interview`
Base: `main` (unchanged; nothing is pushed to GitHub without explicit permission)

## Goal

Turn the single-question interview into a **3-turn, stateful mock interview** that
scores each answer against a rubric, remembers the candidate's **weak areas**, and
reuses them to ask sharper follow-up questions. This closes the P0 gap in
`docs/plan.md` ("Interview Agent: state machine with follow-ups and a transcript")
and satisfies PPT Feature 3 ("Scored feedback; weak areas saved and reused").

## Locked decisions

1. **3 turns** by default (`max_turns = 3`), configurable per interview row.
2. **Unify `POST /api/interviews/{id}/evaluate`** into the turn loop: it submits an
   answer for the current turn and returns the score, feedback, rubric breakdown,
   next question, and status (`IN_PROGRESS` / `COMPLETE`). The old `EVALUATED`
   terminal status is replaced and its test updated.
3. **Add `GET /api/interviews`** history endpoint so weak areas persist and are
   reused across practice runs.

## Non-goals

- No auth/user accounts, no Docker, no deadline reminders (separate workstreams).
- No change to `DashboardResponse` (a test asserts its exact shape); weak areas
  surface through the history endpoint instead.
- No changes to `main` / production. No `git push`.

## Constraints

- Deterministic fallback must implement the whole loop so tests run offline with
  `LLM_PROVIDER=disabled` (see `backend/tests/conftest.py`).
- Every query stays scoped by `session_id`; errors use the existing envelope;
  each agent action keeps writing an `agent_runs` trace via `record_run`.
- Migrations must be SQLite-safe (use `batch_alter_table` + `server_default`).
- One markdown report per phase under `docs/multiturn-interview/`.

## Phases

### Phase 0 — Branch + plan (this document)
Create `feature/multiturn-interview`, record the plan, confirm a green baseline
(`python -m pytest` => 21 passed).

### Phase 1 — Data model + migration
- `backend/app/models.py`
  - New `InterviewTurn`: `id`, `interview_id` (FK -> `interviews.id`, CASCADE),
    `index`, `question`, `answer`, `score`, `feedback`, `rubric` (JSON),
    `created_at`; index on `interview_id`.
  - `Interview` gains: `turn_count` (int, default 0), `max_turns` (int, default 3),
    `weak_areas` (JSON, default `[]`).
- New Alembic revision under `backend/migrations/versions/` adding the table and
  columns with `server_default`, downgrade drops them.
- Verify: `alembic upgrade head` on a scratch DB; import app; existing tests pass.

### Phase 2 — Deterministic tools
- `backend/app/tools.py`
  - `rubric_breakdown(answer, score)` -> per-dimension scores (relevance,
    structure, evidence, accuracy) using the same word/term heuristics as
    `evaluate_answer`.
  - `weak_dimensions(rubric, threshold=60)` -> list of weak dimension names.
  - `next_interview_question(goal, turn_index, weak_areas)` -> deterministic
    question bank keyed by the weakest dimension.
- Verify: unit-style checks via a scratch invocation / tests later.

### Phase 3 — Interview Agent
- `backend/app/agents.py`
  - `InterviewAgent.evaluate(...)` returns `(score, feedback, rubric, llm_meta)`;
    LLM path parses a rubric object, deterministic fallback uses Phase 2 helpers.
  - `InterviewAgent.next_question(goal, transcript, weak_areas)` with LLM path +
    deterministic fallback.
  - Keep `_clean_*` validation helpers; add a rubric sanitizer.

### Phase 4 — Schemas + router
- `backend/app/schemas.py`: `InterviewAnswerRequest` (reuse/rename
  `InterviewEvaluateRequest`), `InterviewTurnOut`, `InterviewAnswerResponse`
  (turn, max_turns, score, feedback, rubric, next_question, status),
  `InterviewDetailResponse` (transcript + weak_areas), `InterviewSummaryOut`,
  `InterviewListResponse`. `InterviewStartResponse` gains `turn`/`max_turns`.
- `backend/app/routers/interviews.py`
  - `POST /api/interviews` (start; persists first question as turn 0).
  - `POST /api/interviews/{id}/evaluate` (submit a turn; advance or complete).
  - `GET /api/interviews/{id}` (transcript + weak_areas).
  - `GET /api/interviews` (history list).
  - Session-scoped lookups, `record_run` traces, consistent 400/404/409 errors.

### Phase 5 — Frontend
- `frontend/src/api/types.ts`, `client.ts`: new request/response types and
  `submitInterviewAnswer`, `getInterview`, `listInterviews`.
- `frontend/src/components/InterviewPanel.tsx`: transcript, current question,
  submit-advances loop, completion summary with weak areas.
- `frontend/src/App.tsx`: `turns[]` state, handlers, history refresh.
- `frontend/src/style.css`: transcript + weak-area styles.

### Phase 6 — Tests + docs
- `backend/tests/test_api.py`: rewrite `test_interview_flow` for 3 turns ->
  `COMPLETE`; assert weak areas recorded and transcript persisted; add session
  isolation for `GET /api/interviews/{id}` and history listing.
- `docs/plan.md`: mark the interview gap done.
- `docs/architecture.md`: data model + interview flow.
- `README.md`: API overview.

## Verification checklist

- `cd backend; .venv\Scripts\python.exe -m pytest -q` (all phases green).
- Manual API loop with `python -m uvicorn app.main:app` + curl: start -> 3 answers
  -> `COMPLETE`, then `GET /api/interviews/{id}` and `GET /api/interviews`.
- `cd frontend; npm run build` succeeds.
- `git status` shows only intended files on `feature/multiturn-interview`.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Per-turn LLM latency/cost | Cap at 3 turns; every step has a deterministic fallback |
| Existing-table migration on SQLite | `batch_alter_table` + `server_default`; test upgrade on a copy |
| Breaking `test_happy_path` dashboard assertion | Do not change `DashboardResponse` |
| Frontend state churn | Isolate transcript in `App.tsx`; keep `InterviewPanel` presentational |
| Accidental production impact | Work only on the feature branch; never push |

## Phase report convention

Each phase writes `docs/multiturn-interview/PHASE-<n>.md` containing: what changed
(files + why), how it was verified (exact commands + result), and follow-ups.
