# Phase 4 — Schemas + interview router endpoints

## What changed

### `backend/app/schemas.py`
- `InterviewStartResponse`: added `turn` (default 0) and `max_turns` (default 3).
- Replaced `InterviewEvaluateResponse` with new models:
  - `InterviewTurnOut` — one persisted turn (`from_attributes=True`).
  - `InterviewAnswerResponse` — result of submitting a turn:
    `interview_id, turn, max_turns, score, feedback, rubric, next_question, status`.
  - `InterviewDetailResponse` — full interview with transcript + weak areas.
  - `InterviewSummaryOut` — lightweight interview summary for listing.
  - `InterviewListResponse` — list wrapper.
- Removed the old single-shot `InterviewEvaluateResponse`.

### `backend/app/routers/interviews.py` (rewritten)
- `POST /api/interviews` — start; persists question as `InterviewTurn` turn 0,
  returns `turn`/`max_turns`/status (`IN_PROGRESS`).
- `POST /api/interviews/{id}/evaluate` — submits the current turn's answer,
  evaluates it (score + feedback + rubric), persists the turn, accumulates
  `weak_areas` via `weak_dimensions`, and either returns the next question
  (`IN_PROGRESS`) or closes the interview (`COMPLETE` once `turn_count >= max_turns`).
  Legacy single-row interviews (no turn rows yet) are handled via `_legacy_turn`.
- `GET /api/interviews/{id}` — full transcript + `weak_areas`.
- `GET /api/interviews` — history list of interviews for the session.
- All lookups are session-scoped; every action is traced via `record_run`;
  errors use the existing `AppError` envelope.

### `backend/app/agents.py` (phase-3 wiring confirmed)
- `evaluate` returns 4-tuple `(score, feedback, rubric, meta)`; router consumes all four.

## Why

- One interview now spans up to 3 turns; weak areas detected from the rubric are
  merged across turns and drive the next question (adaptive practice).
- A separate history endpoint preserves weak areas across runs instead of
  mutating `DashboardResponse` (whose exact shape a test asserts).

## How verified

- `cd backend; .venv\Scripts\python.exe -m pytest -q` => **21 passed**.
  - `test_interview_flow` rewritten for 3 turns -> `COMPLETE`; asserts transcript,
    rubric shape, weak areas, and status transitions.
  - `test_disabled_llm_falls_back_to_deterministic_agents` updated to the 4-tuple.
- Imports OK (`app.schemas`, `app.routers.interviews`).

## Notes / follow-ups

- `DashboardResponse` left unchanged to avoid breaking its exact-match assertion;
  weak areas surface via `GET /api/interviews`.
- Frontend (Phase 5) now needs `submitInterviewAnswer`, `getInterview`, and
  `listInterviews` in `client.ts` plus matching types.
