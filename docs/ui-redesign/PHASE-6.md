# Phase 6 — Audit remediation

## Goal
Act on the `/impeccable` frontend audit (health 10/20; 4 P1, 8 P2, 5 P3). Fix the correctness
and accessibility findings on the shipped warm-ledger redesign, reconcile the documentation with
the code, and re-verify with the existing Playwright flows and the backend test suite.

## Findings and fixes

### P1 — Implementation integrity (docs described a different system)
- `DESIGN.md` described a retired cobalt "Placement Desk" (Instrument Sans, 264px route rail,
  butter signals). Rewrote it to document the **shipped** warm ledger system: the real tokens from
  `src/index.css`, Fraunces/Inter/IBM Plex Mono, the `xl` three-column shell, components, and an
  accessibility contrast contract. Added a **Status** section noting the `.impeccable/` surface
  notes and review goldens (dated 2026-10-28) are historical artifacts of the retired direction.
- Deleted the now-unused self-hosted `frontend/public/fonts/instrument-sans-latin.woff2`.

### P1 — WCAG AA contrast
- `ui.tsx` `Btn` primary: filled with `accentdark` (`#C23B0A`) instead of `accent` (`#E8490F`),
  hover/pressed `#A63308` (5.35:1 for white on fill, up from 3.90:1).
- Small vermilion text switched from `#E8490F` (3.47:1) to `#C23B0A` (4.76:1): `StepHeader`
  eyebrow, `TraceRail`, `ApprovalDialog`, `Landing` Mono eyebrows/commitments, `StepPractice`
  question counter, and the active route-marker fill.
- Amber token darkened `#9A6B12` → `#7A5208` (5.64:1 on its wash, 6.13:1 on paper).
- `::selection` now uses `accentdark` with white text.
- Decorative vermilion is retained only where it clears 3:1 (large display italics, step numbers,
  meter fills, focus outlines, non-text borders).

### P1 — Mobile trace drawer was not keyboard operable
- `TraceRail` drawer now traps focus, closes on Escape, locks body scroll, sets `inert` on the
  header and shell while open, focuses the panel on open, and restores focus to the Trace button
  on close. `aria-labelledby` points at a real title element.

### P1 — Mobile step nav lost step names
- Step names are now visible at every breakpoint (only the agent subtitle stays `sm:`+), each nav
  button has `aria-label="Step 0N: Name"` (plus "(complete)" when done), and the nav gets
  `min-w-0` so the scroll row no longer forces page-level horizontal overflow.

### P2
- Whole workspace re-rendered every second: the session timer moved into an isolated
  `SessionClock` component; the `elapsed` state and interval effect were removed from `Workspace`.
- `ScoreBar` animates `scaleX` from `origin-left` instead of `width`.
- 3-column shell moved from `lg` (1024) to `xl` (1280) for the grid, rail, trace rail, Trace
  button, and drawer, so the working column is no longer cramped at 1024px.
- Touch targets raised to ≥44px: `StepProfile` Remove, `StepMatches` suggestion chips, `Toast`
  dismiss, `StepApprove` queue Review and delete.
- `prefers-reduced-motion`/`useReducedMotion` honored in `App`, `StepMatches`, `StepPractice`,
  `ApprovalDialog`, `TraceRail`, and `ScoreBar`.
- Landing no longer claims "live": the dossier is labelled "example"/"Illustrative preview".
- Google Fonts moved from a render-blocking CSS `@import` to `<link>` tags in `index.html` with
  `preconnect` and `display=swap`; the `<title>` no longer contains mojibake.
- Added an offline state: when the API is unreachable, an alert banner appears with a **Retry
  connection** action that re-runs health + refreshes. Added an "AI status unknown" state when the
  LLM status request fails (previously it read as "Checking AI" forever).
- Leaving the workspace with unsubmitted progress now asks for confirmation.
- Accessibility: added a **Skip to workspace** link (`#workspace-main`), removed
  `aria-live="off"` from `main`, added a polite `sr-only` step announcement, and moved focus to
  the step heading on user step change (skipping first render, off for reduced motion).
- Hard-coded agent colors aligned to the token palette (`lib/agents.ts` job color and the Landing
  dossier entry).

### P3
- Removed the dead `firstRef` in `ApprovalDialog` (kept the panel-focus behavior).
- Removed the unused `formatDuration` from `utils.ts`.
- Replaced the `window.confirm` draft delete with a styled, accessible `ConfirmDialog`
  (`role="alertdialog"`, focus trap, Escape, body lock, focus restore) — also reused for the
  leave-workspace confirmation.

## Verification
- `npm run build` — TypeScript clean.
- `pytest -q` (backend) — 22 passed (no backend changes).
- Playwright at 390×844 (`flow5`): no horizontal overflow at any step; zero interactive targets
  under 44px; no console/page errors.
- Playwright a11y (`flow6`): every `s1..s4-title` resolves, zero nameless buttons, heading order
  intact.
- Playwright practice E2E (`flow4`): upload → search → draft → approve → practice (3 answers,
  feedback, completion, history) with no errors.
- New checks (`flow7`/`flow8`): skip link focuses `#workspace-main`; nav names visible on mobile;
  primary fill resolves to `rgb(194,59,10)`; trace drawer traps focus, Escape closes it and
  restores focus to the Trace button, background is `inert`; 1280px renders three columns
  (280/660/340) with the trace rail inline; 1024px renders one column with the Trace button; step
  change announces and focuses the heading.
- New checks (`flow9`, plus focused `debug-*` helpers): delete and exit confirmations render as
  `alertdialog`, trap focus, and close on Escape; delete detaches and shows the empty state;
  offline banner shows with a working Retry that recovers; AI status shows "AI status unknown"
  when the status endpoint fails.

## Notes
- Remaining intentional `window.confirm`: none in `Workspace`.
- The `.impeccable/` goldens are left on disk as history but are explicitly marked stale in
  `DESIGN.md`.
- No backend or database changes.

## Screenshots
`C:\Users\AMAAN\AppData\Local\Temp\opencode\pc-shots\`:
`mobile-nav-names.png`, `mobile-trace-drawer.png`, `mobile-offline-banner.png`,
`desktop-1280-shell.png`, `desktop-1024-shell.png`, `desktop-confirm-delete.png`,
`desktop-confirm-exit.png`.
