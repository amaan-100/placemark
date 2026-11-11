# Phase 4 — Step 04 (Practice)

## Goal
Port the Interview Agent's multi-turn practice loop to `POST /api/interviews`,
`POST /api/interviews/{id}/evaluate`, `GET /api/interviews/{id}`, and `GET /api/interviews`,
keeping the design's progress chips, rubric panel, and practice history.

## Changes
- `src/components/steps/StepPractice.tsx`
  - Gate: practice is only offered once the selected role's application is `APPROVED`; otherwise
    an `EmptyState` explains why and links back to Step 03.
  - Start card names the selected role and the number of questions, with a loading state while
    the first question is generated.
  - Progress chips `Q1..Qn`: completed, current, and locked states.
  - Question card shows the reviewed question while feedback is on screen (not the next one),
    a collapsible transcript of answered turns, and a textarea with a live word count and a
    20-character minimum.
  - Rubric feedback: score out of 100, a `ScoreBar`, per-dimension values from the backend
    (`relevance` / `structure` / `evidence` / `accuracy`), written feedback, and weak-area chips.
  - Final answer shows its feedback with "View results"; the completion card reports the final
    score/feedback, weak areas, "Practice again", and a link back to Step 03.
  - Rubric sidebar lists the real weights (30/25/25/20) and states whether scoring is
    AI-assisted or deterministic fallback.
  - History: session runs with goal, date, turns, status, weak areas, and an expandable
    transcript fetched on demand from `GET /api/interviews/{id}`.
- `src/components/Workspace.tsx`
  - Interview state (`interview`, `currentQuestion`, `answer`, `evaluation`, `turns`,
    `weakAreas`, `interviewComplete`, history, expanded detail) and handlers
    `handleStartInterview`, `handleSubmitAnswer`, `handleToggleHistory`, plus boot-time
    `refreshInterviews`.
  - Start goal is `${title} at ${company}` for the selected role; dashboard/traces/history
    refresh after starting and after each answer.
- `src/components/Workspace.tsx`: Step 04 now renders the real component with all props.

## Verification
- `npm run build` — TypeScript clean.
- Browser smoke test against the live backend: approve → Practice → gate shown → start → 3
  answers → rubric scores rendered → "View results" → completion card → history row expands and
  shows per-turn scores/feedback; no console errors.
- Screenshots: `step4-feedback.png`, `step4-final-feedback.png`, `step4-complete.png`.

## Notes
- The backend rubric dimensions and weights are rendered as returned; no design-only fields
  (model answers, strengths) are invented.
- Practice history is per session (as the API scopes it) and is not filtered by role; the
  selected role is shown on the start/completion cards.
- Scores can legitimately be low when the answer does not match the role's technical question;
  that is the Interview Agent's judgement, not a UI bug.
