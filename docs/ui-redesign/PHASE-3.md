# Phase 3 — Step 03 (Approve + queue)

## Goal
Port the approval step and integrate the design's standalone queue into Step 03, using the real
approval contract (`PATCH` edit, `POST .../approve`) and the design's two-check gate.

## Changes
- `src/components/steps/StepApprove.tsx`
  - No-role state with a link back to Step 02.
  - Drafting skeletons while the Document Agent works; a "no draft yet" card offers "Draft for
    this role" when a role is selected without an application.
  - Pending/approved banner with stamp and the grounding check, plus cover note and resume draft
    articles (copy buttons) exactly as returned by the backend.
  - Actions: "Review for approval" (opens the dialog), "Practice for this role" (Step 04), and
    delete with a confirm.
  - Approval queue lists every application with status chips, Review/Open, and delete; approved
    rows are marked so the queue stays honest.
- `src/components/ApprovalDialog.tsx`
  - Editable cover note and resume draft (20k / 8k limits), explicit two-check gate (checkbox +
    typing `approve`), focus trap, Escape/body-lock, sticky header/footer, and inline errors.
  - "Approve & record decision" stays disabled until both checks pass; the accessible name is the
    visible text.
- `src/components/Workspace.tsx`
  - Added `deletingApplicationId`, `handleOpenApplication` (maps an application back to its job
    when available), `handleDeleteApplication` (`window.confirm` + delete + refresh).
  - `handleApprove` now applies optimistic updates (application status, pending/approved counters)
    before refreshing; `handleDeleteApplication` filters the row out immediately.
  - `handleSaveDraft` resets approval when an approved draft is edited (backend rule) and says so
    in the toast.
- `src/components/TraceRail.tsx`: `checking?: boolean` so the rail and header show a neutral
  "Checking AI" state before `/api/llm/status` resolves.

## Verification
- `npm run build` — TypeScript clean.
- Browser smoke test against the live backend: upload → search → select → draft → Step 03 queue →
  Review → dialog reports `disabledBefore=true`, `disabledAfterCheck=true`, `disabledReady=false`
  → approve → approved banner present, dialog gone, no console errors (only the benign
  `/api/resume/latest` 404).
- Screenshots: `step3-drafted.png`, `step3-queue.png`, `dialog.png`, `step3-approved.png`.

## Notes
- The backend owns approval rules; the dialog only mirrors them. Editing an approved draft
  legitimately resets it to `PENDING_APPROVAL`, and the UI explains the reset.
- Nothing is sent anywhere: approving records a decision and updates the local ledger only.
