# Phase 1 — Data model and migration

## What changed

### `backend/app/models.py`
- **New `InterviewTurn` table** (`interview_turns`): one row per answered turn.
  - `id`, `interview_id` (FK -> `interviews.id`, `ondelete=CASCADE`), `turn_index`,
    `question`, `answer`, `score`, `feedback`, `rubric` (JSON), `created_at`.
  - Index `ix_interview_turns_interview_id` for transcript lookups.
  - Named `turn_index` (not `index`) to avoid a reserved-word clash.
- **`Interview` extended** with three columns:
  - `turn_count` (int, default `0`) — how many turns have been answered.
  - `max_turns` (int, default `3`) — the locked default interview length.
  - `weak_areas` (JSON, default `[]`) — accumulated weak-dimension list.

### `backend/migrations/versions/9f4b2a1c7d03_multiturn_interview.py` (new)
- Creates `interview_turns` + its index.
- Adds `turn_count` / `max_turns` / `weak_areas` to `interviews` using
  `batch_alter_table` with `server_default` values, so the change is SQLite-safe
  and existing rows stay valid.
- Backfills `turn_count = 1` for existing interviews that already have an answer.
- `downgrade()` drops the columns and the table in reverse order.

## Why

- The current `Interview` row can only hold a single `question`/`answer`/`score`
  (`models.py:97`), so there is nowhere to store a transcript or remembered weak
  areas. A child table keeps each turn auditable while `weak_areas` on the parent
  supports "saved and reused" across the run.
- `max_turns` lives on the row (not just config) so an interview's length is
  fixed at creation time and can vary later.

## How verified

- Fresh scratch DB: `DATABASE_URL=sqlite:///<temp>/phase1.db alembic upgrade head`
  - `interviews` columns include `turn_count, max_turns, weak_areas`.
  - `interview_turns` has the expected 9 columns.
- Reversibility: `alembic downgrade -1` removed the columns/table; `alembic upgrade
  head` restored them.
- Full suite: `cd backend; .venv\Scripts\python.exe -m pytest -q` => **21 passed**
  (the app still migrates and runs on a fresh DB).

## Notes / follow-ups

- The `weak_areas` server default is the string `'[]'`; the ORM `default=list`
  applies to new inserts, the server default covers raw SQL/migration paths.
- Phase 2 adds the deterministic helpers that populate the `rubric` and
  `weak_areas` structures introduced here.
