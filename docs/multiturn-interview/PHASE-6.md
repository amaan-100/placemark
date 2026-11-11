# Phase 6 — Tests + docs

## Tests (`backend/tests/`)

### `test_api.py::test_interview_flow` (rewritten)
- Starts an interview, asserts `turn == 0`, `max_turns == 3`, `status == IN_PROGRESS`.
- Submits the same strong answer 3 times; asserts each response carries
  `turn`, `max_turns`, `score`, `feedback`, a complete 4-key rubric, and
  `status` progressing `IN_PROGRESS → IN_PROGRESS → COMPLETE`.
- `GET /api/interviews/{id}` returns the full 3-turn transcript and
  non-empty `weak_areas`.

### `test_llm.py::test_disabled_llm_falls_back_to_deterministic_agents`
- Updated `orchestrator.interview.evaluate(...)` unpacking from 3-tuple to
  4-tuple `(score, feedback, rubric, meta)`; asserts the full rubric key set
  and that `meta["used"] is False`.

Full suite: `cd backend; .venv\Scripts\python.exe -m pytest -q` => **21 passed**.

## Docs

### `docs/plan.md`
- Current gaps: interview is now a multi-turn state machine with weak-area memory
  (pointer to `docs/multiturn-interview/`).
- P0 checklist: `Interview Agent: state machine with follow-ups and a transcript`
  marked `[x]`.

### `docs/architecture.md`
- Data model: `interviews` gains `turn_count`/`max_turns`/`weak_areas`; new
  `interview_turns` table.
- LLM providers: interview follow-ups targeted at weak areas + per-turn rubric.
- Next: multi-turn interview marked "shipped".

### `README.md`
- API overview now lists `GET /api/interviews/{id}` and `GET /api/interviews`
  alongside the existing POST endpoints.

### `docs/multiturn-interview/`
- `PLAN.md` + `PHASE-0.md` through `PHASE-6.md` (this document).

## Verification checklist (all green)
- Backend: `python -m pytest -q` => 21 passed.
- Frontend: `npm run build` => `tsc --noEmit` clean + vite build succeeds.
- Git: all changes confined to `feature/multiturn-interview`; `main` untouched;
  nothing pushed to GitHub.

## What's done
The mock interview is now a 3-turn, stateful practice session:
start → answer → score + rubric → follow-up targeted at the weakest area → repeat
→ complete with a weak-area summary. Weak areas persist across runs via
`GET /api/interviews` history. All paths have a deterministic fallback, so the
feature works with `LLM_PROVIDER=disabled`.
