# Phase 5 — Polish, cleanup, and QA

## Goal
Finish the redesign: remove the legacy UI, correct copy that overpromised, fix accessibility
gaps found during QA, and verify the whole flow on desktop and mobile.

## Changes
- Removed the pre-redesign UI that nothing imports anymore:
  - `src/components/ApplicationsPanel.tsx`, `ApprovalModal.tsx`, `Header.tsx`, `Icon.tsx`,
    `InterviewPanel.tsx`, `JobsPanel.tsx`, `Panel.tsx`, `ResumePanel.tsx`, `Sidebar.tsx`,
    `StatCard.tsx`, `StatusBadge.tsx`, `TracePanel.tsx`.
  - `src/style.css` (the old hand-written stylesheet).
- `src/components/Landing.tsx`: corrected trust copy. The resume **is** uploaded to the
  session-scoped backend, so "Nothing sent" became "Nothing auto-submitted" (header and dossier
  footer). The claim now matches behaviour: no account, no employer submission, approval only
  records a decision.
- `src/components/StepHeader.tsx`: the step `<h2>` now carries `id="s{n}-title"`, so every
  `section[aria-labelledby="s{n}-title"]` resolves to a real heading.
- `src/components/steps/StepPractice.tsx`: the current question chip shows an accent dot instead
  of a lock (only upcoming questions are locked).

## Verification
- `npm run build` — TypeScript clean after the deletions and copy changes.
- Mobile QA at 390×844 (Chrome, deviceScaleFactor 2) across landing, Step 01 empty/uploaded,
  Step 02 results, Step 03, the approval dialog, Step 04 start/question:
  - `document.documentElement.scrollWidth === window.innerWidth` at every step (no horizontal
    overflow).
  - No interactive target under 40×40 px in `main`/`nav`.
  - No console or page errors.
- Accessibility spot-check on desktop: every step section's `aria-labelledby` resolves, no
  icon-only button lacks an accessible name, heading order is `h2` (then `h3` where sections
  nest).
- End-to-end flow re-run after cleanup: upload → search → draft → review → approve → practice
  (3 answers, feedback, completion, history) with no regressions.

## Notes
- The dialog's two-check gate, focus trap, Escape/body-lock, and 44px minimum target sizing were
  already in place from Phase 3; this phase only verified them at mobile width.
- `fullPage` screenshots still show `Reveal` (`whileInView`) sections as blank and duplicate the
  sticky header; that is a screenshot artifact, not a layout bug.
- No backend or database changes were made in any phase.
