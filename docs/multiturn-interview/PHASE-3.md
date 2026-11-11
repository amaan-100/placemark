# Phase 3 — InterviewAgent multi-turn and rubric scoring

## What changed (`backend/app/agents.py`)

- **Imports**: added `RUBRIC_WEIGHTS`, `next_interview_question`, `rubric_breakdown`
  from `tools.py`.
- **Prompts**:
  - `EVALUATION_SYSTEM` updated to mention "accuracy" (was "clarity").
  - New `FOLLOWUP_SYSTEM` for adaptive follow-up questions.
- **`_clean_rubric(value, fallback)`**: sanitizes an LLM-provided rubric object,
  coercing each of the four dimensions via `_clean_score` and falling back per
  dimension.
- **`InterviewAgent.evaluate(...)`** now returns a **4-tuple**
  `(score, feedback, rubric, meta)`:
  - Deterministic path: `evaluate_answer` + `rubric_breakdown`.
  - LLM path: prompt now also requests a `"rubric"` object; the result is cleaned
    with `_clean_rubric` (falling back to the deterministic breakdown).
- **`InterviewAgent.next_question(goal, transcript, weak_areas)`** (new): returns
  `(question, meta)`.
  - Deterministic path: `next_interview_question(goal, len(transcript), weak_areas)`.
  - LLM path: `FOLLOWUP_SYSTEM` + last 3 turns + weak-area focus; rejects answers
    that are invalid or duplicate an earlier question, falling back deterministically.

## Why

- The agent layer owns generation/validation; keeping rubric + follow-up logic here
  means the router stays thin and every path records an `llm` trace via `meta`.
- Rejecting duplicate follow-ups prevents the LLM from looping on the same question.

## How verified

Scratch run with `LLM_PROVIDER=disabled` (fallback path):

```
Q0: Explain a security incident you would investigate first in a SOC and why.
score: 40  rubric: {relevance 44, structure 42, evidence 29, accuracy 46}
feedback: Answer is too short. Give context, your approach, evidence, and outcome.
Q1: Walk me through a specific project where you applied cybersecurity internship
    skills. What exactly did you do, and what was the outcome?
```

The weak-areas input `['evidence','structure']` correctly drove an evidence-focused
follow-up, and all three calls returned the generic `used`-only public trace meta.

## Notes / follow-ups

- `evaluate` changed from a 3-tuple to a 4-tuple, so the current call site in
  `routers/interviews.py:74` is updated in Phase 4. The full test suite is run at
  the end of Phase 4; until then the interview endpoint is mid-refactor by design.
- The deterministic `question()` (first question) is unchanged.
