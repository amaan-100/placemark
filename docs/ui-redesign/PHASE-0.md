# Phase 0 — Design-system foundation

## Goal
Lay the frontend foundation for the `generated-design.zip` redesign without changing the
backend, database, or API contract.

## Changes
- Added frontend dependencies:
  - `framer-motion@14.10.1`
  - `lucide-react@1.70.0`
  - `clsx@2.1.1`, `tailwind-merge@3.4.0`
  - `tailwindcss@4.3.5` + `@tailwindcss/vite@4.3.5` (dev)
- `vite.config.ts`: registered the Tailwind v4 Vite plugin.
- `src/index.css`: ported the design tokens and global layer from the reference design —
  warm paper palette (`paper`, `paper2`, `card`, `ink`, `inksoft`, `line`, `linedark`),
  accents (`accent`, `moss`, `amber`, `err`), Fraunces / Inter / IBM Plex Mono fonts,
  grain overlay, ruled ledger lines, focus ring, scrollbars, stamp, and shimmer skeleton.
- `src/utils/cn.ts`: `clsx` + `tailwind-merge` helper.
- `src/components/ui.tsx`: shared primitives — `Reveal`, `Mono`, `Btn`, `Chip`, `ScoreBar`,
  `Skeleton`, `EmptyState`, `EASE`.
- `src/lib/agents.ts`: `AGENT_META` (resume/job/document/interview/system) plus helpers to map
  real backend traces (`agent`, `action`, `output.llm`) into design-style trace events.
- `index.html`: updated title and theme color to the paper palette.

## Verification
- `npm run build` — TypeScript clean, Vite build succeeds.
- No backend or database files touched.

## Notes
- `src/index.css` is created but not yet imported; the old `style.css` still drives the
  current UI until Phase 1 swaps the entry point. This keeps the app visually intact between
  phases.
- Tailwind v4.3.5 declares Vite `^5.2 || ^6 || ^7 || ^8`, so it is compatible with the
  project's Vite 8.3.5.
