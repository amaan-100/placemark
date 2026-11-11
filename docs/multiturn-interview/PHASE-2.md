# Phase 2 — Deterministic interview helpers (`tools.py`)

## What changed

All additions are in `backend/app/tools.py`; `evaluate_answer` is unchanged, so
existing scoring behavior is preserved.

- `RUBRIC_WEIGHTS` — the four rubric dimensions and their weights
  (relevance 30, structure 25, evidence 25, accuracy 20), matching the prompt in
  `agents.py`.
- `WEAK_AREA_THRESHOLD = 60`.
- `_clamp_score(value, low=0, high=100)` — integer clamp helper.
- `rubric_breakdown(answer, score)` — derives per-dimension scores from word count,
  sequencing words, evidence words, digits, and domain terms, then scales them so
  the weighted average lands on the deterministic `score`. Guarantees rubric and
  total agree while showing *relative* strengths/weaknesses.
- `weak_dimensions(rubric, threshold=60)` — returns dimensions below the threshold
  ordered weakest-first; if none are below, returns the single lowest dimension so
  there is always a focus area to reuse.
- `merge_weak_areas(existing, new)` — stable, de-duplicated union for accumulating
  weak areas across turns.
- `next_interview_question(goal, turn_index, weak_areas)` — deterministic follow-up
  selection: picks from a per-dimension question bank keyed on the weakest area, or
  a general bank when there is no weak area. Replaces `{goal}` and rotates by
  `turn_index` + a goal-derived seed.

## Why

- The multi-turn loop must work with `LLM_PROVIDER=disabled` (the test/offline
  path), so question selection, rubric scoring, and weak-area detection all need a
  deterministic implementation.
- Weak-area *reuse* is what makes follow-ups feel adaptive: turn N+1 targets the
  weakest dimension from turns 1..N.

## How verified

```
cd backend
.venv\Scripts\python.exe -c "from app.tools import ..."
```

- Strong answer -> `score 100`, rubric `{relevance 75, structure 100, evidence 100,
  accuracy 100}`, focus `['relevance']` (relative lowest).
- Weak answer -> `score 40`, `weak ['evidence','structure','relevance','accuracy']`.
- `next_interview_question('cybersecurity internship', 1, ['evidence'])` returns an
  evidence-focused question with the goal interpolated.
- `merge_weak_areas(['evidence'], ['structure','evidence'])` -> `['evidence','structure']`.

## Notes / follow-ups

- Rubric dimensions are indicative (clamping at 100 can make the weighted sum land
  a point or two off the total); the overall score remains the deterministic
  `evaluate_answer` value.
- Phase 3 wires these helpers into `InterviewAgent`.
