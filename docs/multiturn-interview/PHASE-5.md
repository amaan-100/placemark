# Phase 5 — Frontend (multi-turn interview UI)

## What changed

### `frontend/src/api/types.ts`
- `InterviewStart`: added `turn` and `max_turns`.
- Replaced `InterviewEvaluation` with new types matching the backend:
  `InterviewTurnOut`, `InterviewAnswerResponse`, `InterviewSummaryOut`,
  `InterviewDetailResponse`, `InterviewListResponse`.

### `frontend/src/api/client.ts`
- Renamed `evaluateInterview` → `submitInterviewAnswer` (returns
  `InterviewAnswerResponse`).
- Added `getInterview(interviewId)` → `GET /api/interviews/{id}` and
  `listInterviews()` → `GET /api/interviews`.

### `frontend/src/App.tsx`
- State: `currentQuestion`, `turns`, `weakAreas`, `interviewHistory`,
  `interviewComplete`.
- `handleStartInterview` resets turn transcript/weak areas/complete flag and
  refreshes interviews.
- New `handleSubmitAnswer`: submits the answer, refreshes the interview detail
  (authoritative transcript + weak areas), advances `currentQuestion` to
  `next_question`, and marks completion when status is `COMPLETE`.
- New `refreshInterviews` + mount effect to load practice history.
- JSX: `InterviewPanel` receives transcript/weak areas/completion state; added
  a "Practice history" panel listing past interviews with weak areas.

### `frontend/src/components/InterviewPanel.tsx` (rewritten)
- Renders the current question, an answered-answers transcript, a turn counter
  and focus-area chips, a submit button, per-turn score, the last rubric result,
  and a completion summary with weak areas plus a "Practice again" button.
- Submit disabled while evaluating or while the answer is empty.

### `frontend/src/style.css`
- Added styles for the transcript, per-turn cards, weak-area chips, and the
  completion score panel.

## Why

- The frontend had to mirror the new turn-loop contract (`next_question`,
  `status`, `rubric`, `turn`, `max_turns`) so the demo can show adaptive
  follow-ups and accumulated weak areas.

## How verified

- `cd frontend; npm run build` => `tsc --noEmit` clean, `vite build` succeeds
  (31 modules transformed, assets emitted).

## Notes / follow-ups

- Backend tests for the new flow were updated alongside Phase 4 so the full
  suite stays green; Phase 6 updates the docs (`docs/plan.md`,
  `docs/architecture.md`, `README.md`).
