# Phase 1 — Shell, landing, and Step 01 (Profile)

## Goal
Replace the legacy dashboard shell with the design's landing page + four-step workspace, and
port Step 01 to the real resume API.

## Changes
- `src/main.tsx` now imports `./index.css` (Tailwind v4 entry) instead of `style.css`.
- `src/App.tsx`: landing ⇄ workspace switch with `AnimatePresence`, grain background.
- `src/components/Landing.tsx`: full marketing page — hero, live "session dossier" card,
  the four-step loop, three trust commitments, closing CTA, footer. Enter/exit are wired to
  the workspace; all copy reflects the real product (no fake submissions).
- `src/components/Workspace.tsx`: the shell.
  - Sticky header: back-to-overview, session short id, elapsed clock, AI/fallback status,
    mobile trace toggle, wake notice, fallback banner.
  - Left rail: four steps with done/current/todo state, session counters (applications,
    pending, approved, interviews), session status (mode/resume/role/draft/queue).
  - Stage: `AnimatePresence`-swapped steps; desktop `TraceRail`; mobile trace drawer.
  - Boots health, dashboard, applications, traces, resume, and LLM status from the existing
    API; treats a 404 on `/resume/latest` as "no resume yet".
  - Toasts auto-dismiss after 6s.
- `src/components/steps/StepProfile.tsx`: real Step 01 — drag/drop or browse, PDF-only
  validation, upload progress, error card, file card with Remove, extracted summary and
  skill chips, grounded-facts panel, role/location inputs, "Find matches".
- Supporting components: `StepHeader`, `Toast` (kind + message), `TraceRail` (real `Trace[]`,
  skeleton/empty states, agent mode badges), `lib/steps.ts`, `lib/agents.ts`, `lib/roles.ts`
  (default query from the top extracted skill), `utils/cn.ts`, `components/ui.tsx`.
- `ApprovalDialog.tsx`: new editable-draft dialog with the two-check approval gate
  (checkbox + typed `approve`), focus trap, Escape, body scroll lock, 20k/8k limits.

## Verification
- `npm run build` — TypeScript clean, Vite build succeeds.
- Browser smoke test (Chrome, Playwright): landing renders with Fraunces/Inter/Plex Mono
  loaded, no console errors, paper background `rgb(246,241,231)`, workspace shows 4 steps.
- Real resume upload through the UI returns parsed skills and a trace entry.

## Notes
- Old components (`ResumePanel`, `JobsPanel`, `Sidebar`, `Header`, …) remain on disk but are
  no longer imported; they are removed in Phase 5 once every step is ported.
- The approval dialog is implemented here because the draft edit/approve contract is shared
  by Step 03; Step 03 itself is wired in Phase 3.
