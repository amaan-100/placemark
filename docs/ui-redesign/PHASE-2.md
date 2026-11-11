# Phase 2 — Step 02 (Matches)

## Goal
Port the job-matching step to `POST /api/jobs/search`, keeping the design's ranked-list
treatment while using only fields the backend actually returns.

## Changes
- `src/components/steps/StepMatches.tsx`
  - Guard state when no resume is parsed, with a link back to Step 01.
  - Query + location form (submit on Enter), quick-search suggestions, live search skeletons
    that state whether the Job Agent or the fallback ranker is running.
  - Results header shows count, source (`live_api` / `mock_fallback`), cached, and fallback
    chips.
  - Ranked `<ol>` of roles sorted by `match_score`: rank number, title, company, location,
    deadline, `ScoreBar`, skill chips, external "View original listing" link.
  - Selecting a role highlights the card and enables "Draft for this role"; empty and
    pre-search states use `EmptyState`.
- `src/components/Workspace.tsx`
  - Added jobs/search state and handlers: `handleSearch` (calls `api.searchJobs`), `handleDraft`
    (calls `api.draftApplication`, refreshes applications/dashboard/traces, advances to Step 03).
  - Resume upload/removal clears stale search results; "Role" session status reflects a
    selected role; step 2 is marked done once a role is selected.
- `src/lib/roles.ts`: deterministic default query from the resume's top skill so the search
  box is pre-filled meaningfully.

## Verification
- `npm run build` — TypeScript clean.
- Browser smoke test against the live backend: upload → Step 02 → search returns 12 ranked
  roles, select #1 → draft call succeeds and a toast confirms the draft.
- Traces show the `job` search entry and the `document` draft entry.

## Notes
- The backend exposes no `type`, `signals`, `missing`, `summary`, or `posted` fields on a job,
  so the design's signal/gap chips are replaced with the job's real `skills`, and type filters
  are omitted rather than faked.
- Job cards keep the real listing URL and open it in a new tab; nothing is submitted.
