# Phase 7 — Frontend fixes (answer clear, Q3 submit, history Q&A)

## Issues fixed

### 1. Answer field persisted across turns
**Problem:** After submitting Q1, the textarea still held the Q1 answer when Q2 appeared.  
**Fix:** `handleSubmitAnswer` in `App.tsx` now calls `setAnswer('')` after each submit, so the field is blank for the next question.

### 2. Could not submit answer for Q3
**Problem:** `turnIndex` was computed as `turns.length + 1`, where `turns` includes the unanswered current turn. After Q2, `turns.length` was 3 (2 answered + 1 unanswered), so `turnIndex = 4 > maxTurns (3)` and the submit button was disabled.  
**Fix:** `turnIndex` now counts only answered turns: `turns.filter(t => t.answer !== null).length + 1`. After Q2 that's `2 + 1 = 3`, so `3 > 3` is false and Q3 can be submitted.

### 3. Practice history Q&A visibility
**Decision:** Add an expandable detail view per history item showing Q+A + score. Data already lives in `interview_turns` (Neon storage cost is negligible—interview text is tiny, and usage will be low). Added a per-item "View Q&A"/"Collapse" toggle that fetches `GET /api/interviews/{id}` and renders the transcript.  
**Retention note:** If storage becomes a concern, a TTL-based cleanup (e.g., delete interviews older than N days) can be added later without schema changes.

## Files changed
- `frontend/src/App.tsx` — `setAnswer('')` after submit; `expandedInterviewId`/`interviewDetails` state; `toggleHistoryDetail`; expandable history rows with Q&A.
- `frontend/src/components/InterviewPanel.tsx` — `turnIndex` counts answered turns only.
- `frontend/src/style.css` — styles for history detail view.

## Root cause of the "Q3 still disabled" report
The source fix was correct, but the running **Vite dev server had gone stale**: its file
watcher never picked up the edits, so the browser kept receiving the old transform
(`const turnIndex = (turns?.length ?? 0) + 1`). After Q2 that yields `4 > maxTurns (3)`,
disabling the button. Verified by fetching `http://127.0.0.1:5173/src/components/InterviewPanel.tsx`
directly — the served module lacked `answeredTurns`.

**Resolution:** killed the stale `vite` + `npm run dev` processes, restarted `npm run dev`,
and re-fetched the module to confirm it now serves `answeredTurns` / `setAnswer('')` /
`toggleHistoryDetail`. Always hard-refresh the browser after a restart (Ctrl+Shift+R).

## Verification
- `npm run build` → tsc clean + vite build OK.
- Dev server module fetch confirms the new code is served.
- Live smoke test (3 distinct answers): turn 1 → turn 2 → turn 3 COMPLETE, all 3 turns answered, weak areas recorded.
- Backend suite still green: `pytest -q` → 21 passed.
