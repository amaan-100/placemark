import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import type { Application, ApplicationUpdate } from '../api/types';
import { Btn, Chip, EASE, Mono } from './ui';

export type DraftValues = {
  resume_draft: string;
  cover_note: string;
};

const RESUME_LIMIT = 20_000;
const COVER_LIMIT = 8_000;

export function ApprovalDialog({
  application,
  saving,
  approving,
  fallback,
  onSave,
  onConfirm,
  onClose,
}: {
  application: Application | null;
  saving: boolean;
  approving: boolean;
  fallback: boolean;
  onSave: (draft: ApplicationUpdate) => Promise<Application | null>;
  onConfirm: (draft: ApplicationUpdate) => Promise<boolean>;
  onClose: () => void;
}) {
  const open = application !== null;
  const [coverNote, setCoverNote] = useState('');
  const [resumeDraft, setResumeDraft] = useState('');
  const [deadline, setDeadline] = useState('');
  const [checked, setChecked] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!application) {
      return;
    }
    setCoverNote(application.cover_note);
    setResumeDraft(application.resume_draft);
    setDeadline(application.deadline ?? '');
    setChecked(false);
    setTyped('');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.id]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => panelRef.current?.focus(), 60);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'Tab' && panelRef.current) {
        const elements = panelRef.current.querySelectorAll<HTMLElement>(
          'button, input, textarea, [href], [tabindex]:not([tabindex="-1"])',
        );
        const list = Array.from(elements).filter((element) => !element.hasAttribute('disabled'));
        if (!list.length) {
          return;
        }
        const first = list[0];
        const last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!application) {
    return null;
  }

  const isApproved = application.status === 'APPROVED';
  const busy = saving || approving;
  const savedDeadline = application.deadline ?? '';
  const draftsDirty =
    coverNote !== application.cover_note || resumeDraft !== application.resume_draft;
  const deadlineDirty = deadline !== savedDeadline;
  const dirty = draftsDirty || deadlineDirty;
  const ready = checked && typed.trim().toLowerCase() === 'approve';
  // A deadline-only edit on an approved draft records no approval decision, so it
  // does not need the typed confirmation.
  const needsConfirmation = !(isApproved && !draftsDirty && deadlineDirty);

  const confirmLabel = isApproved
    ? draftsDirty
      ? 'Save & re-approve'
      : deadlineDirty
        ? 'Save deadline'
        : 'Approved'
    : draftsDirty || deadlineDirty
      ? 'Save & approve'
      : 'Approve & record decision';

  const values = (): DraftValues | null => {
    const cleanCover = coverNote.trim();
    const cleanResume = resumeDraft.trim();
    if (!cleanCover || !cleanResume) {
      setError('Both the cover note and resume draft need text before saving.');
      return null;
    }
    return { cover_note: cleanCover, resume_draft: cleanResume };
  };

  const buildUpdate = (): ApplicationUpdate | null => {
    const draft = values();
    if (!draft) {
      return null;
    }
    const update: ApplicationUpdate = { ...draft };
    if (deadline !== savedDeadline) {
      update.deadline = deadline.trim() === '' ? null : deadline;
    }
    return update;
  };

  const handleSave = async () => {
    const update = buildUpdate();
    if (!update) {
      return;
    }
    setError(null);
    const updated = await onSave(update);
    if (!updated) {
      setError('The draft could not be saved. Check the connection and try again.');
      return;
    }
    setCoverNote(updated.cover_note);
    setResumeDraft(updated.resume_draft);
    setDeadline(updated.deadline ?? '');
  };

  const handleConfirm = async () => {
    const update = buildUpdate();
    if (!update) {
      return;
    }
    setError(null);
    const confirmed = await onConfirm(update);
    if (!confirmed) {
      setError('The draft could not be approved. Check the connection and try again.');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="approval-title"
        >
          <div
            className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={reduce ? false : { opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-[6px] border border-ink bg-card shadow-[0_24px_60px_rgba(22,19,14,0.35)] outline-none sm:rounded-[6px]"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b-2 border-ink bg-card px-6 py-5 sm:px-8">
              <div>
                <Mono className="text-accentdark">Step 03 — Approval gate</Mono>
                <h2
                  id="approval-title"
                  className="mt-1 font-display text-2xl font-semibold leading-tight sm:text-3xl"
                >
                  Record your decision.
                </h2>
                <p className="mt-1 text-sm text-inksoft">
                  For <strong className="text-ink">{application.title}</strong> at{' '}
                  <strong className="text-ink">{application.company}</strong>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isApproved ? <Chip tone="moss">Approved</Chip> : <Chip tone="amber">Pending</Chip>}
                <button
                  onClick={onClose}
                  aria-label="Close approval dialog"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line hover:border-ink hover:bg-paper2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[4px] border border-moss/40 bg-mossbg/60 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-moss">
                    <ShieldCheck className="h-4 w-4" /> What approval does
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink">
                    <li>· Records your decision in this session, with a timestamp.</li>
                    <li>· Marks the draft as approved and ready to copy.</li>
                    <li>· Unlocks interview practice for this role.</li>
                  </ul>
                </div>
                <div className="rounded-[4px] border border-line bg-paper2/70 p-4">
                  <p className="text-sm font-semibold">What it never does</p>
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-inksoft">
                    <li>· It does not submit anything to an employer.</li>
                    <li>· It does not send your resume or cover note.</li>
                    <li>· It does not contact anyone on your behalf.</li>
                  </ul>
                </div>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-inksoft">
                {fallback
                  ? 'This draft was produced in fallback mode (deterministic templates, no AI). Review it with extra care — every claim is grounded in your resume, but the wording is template-based.'
                  : 'This draft was produced with AI assistance. Every claim in it is grounded in your resume — check the extracted facts in Step 01 before you approve.'}
              </p>

              {isApproved ? (
                <p className="mt-4 rounded-[4px] border border-amber/40 bg-amberbg px-4 py-3 text-[13px] leading-relaxed text-amber">
                  This draft is already approved. Changing the deadline keeps your approval.
                  Editing the cover note or resume draft resets it to pending, and you will need to
                  approve the edited text again.
                </p>
              ) : null}

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="approval-deadline" className="text-sm font-medium">
                    Application deadline
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      id="approval-deadline"
                      type="date"
                      value={deadline}
                      onChange={(event) => setDeadline(event.target.value)}
                      disabled={busy}
                      className="min-h-[44px] rounded-[3px] border border-linedark bg-paper px-3 font-mono text-sm focus:border-accent"
                    />
                    {deadline ? (
                      <button
                        type="button"
                        onClick={() => setDeadline('')}
                        disabled={busy}
                        className="flex min-h-[44px] items-center rounded-[3px] px-3 text-xs font-medium text-inksoft hover:text-ink"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs text-inksoft">
                    {deadline
                      ? `Reminder will show as ${deadline}.`
                      : 'Not set. Live listings often omit a deadline — add one to track it.'}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="approval-cover-note" className="text-sm font-medium">
                    Cover note
                  </label>
                  <textarea
                    id="approval-cover-note"
                    value={coverNote}
                    maxLength={COVER_LIMIT}
                    rows={6}
                    spellCheck
                    onChange={(event) => setCoverNote(event.target.value)}
                    disabled={busy}
                    className="mt-2 w-full rounded-[3px] border border-linedark bg-paper p-3 text-sm leading-relaxed focus:border-accent"
                  />
                  <span className="mt-1 block text-right font-mono text-[10px] text-inksoft">
                    {coverNote.length.toLocaleString()} / {COVER_LIMIT.toLocaleString()}
                  </span>
                </div>
                <div>
                  <label htmlFor="approval-resume-draft" className="text-sm font-medium">
                    Resume draft
                  </label>
                  <textarea
                    id="approval-resume-draft"
                    value={resumeDraft}
                    maxLength={RESUME_LIMIT}
                    rows={9}
                    spellCheck
                    onChange={(event) => setResumeDraft(event.target.value)}
                    disabled={busy}
                    className="mt-2 w-full rounded-[3px] border border-linedark bg-paper p-3 font-mono text-[13px] leading-relaxed focus:border-accent"
                  />
                  <span className="mt-1 block text-right font-mono text-[10px] text-inksoft">
                    {resumeDraft.length.toLocaleString()} / {RESUME_LIMIT.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-4 rounded-[4px] border border-line bg-paper p-5">
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => setChecked(event.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#C23B0A]"
                  />
                  <span>
                    I have read the cover note and resume draft, and I confirm every claim matches
                    my resume.
                  </span>
                </label>
                <div>
                  <label htmlFor="type-approve" className="text-sm font-medium">
                    Type <span className="font-mono font-semibold text-accentdark">approve</span> to
                    confirm
                  </label>
                  <input
                    id="type-approve"
                    type="text"
                    value={typed}
                    onChange={(event) => setTyped(event.target.value)}
                    autoComplete="off"
                    placeholder="approve"
                    className="mt-2 min-h-[44px] w-full rounded-[3px] border border-linedark bg-card px-3 font-mono text-sm placeholder:text-inksoft/50 focus:border-accent"
                  />
                </div>
              </div>

              {error ? (
                <p className="mt-4 rounded-[4px] border border-err/40 bg-errbg px-3 py-2 text-sm text-err" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-line bg-card px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="font-mono text-[11px] uppercase tracking-wider text-inksoft">
                {!dirty
                  ? 'No changes yet'
                  : needsConfirmation
                    ? ready
                      ? 'Ready — approval records only'
                      : 'Both checks required'
                    : 'Deadline only — approval kept'}
              </p>
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Btn variant="ghost" onClick={onClose} disabled={busy}>
                  Cancel
                </Btn>
                <Btn variant="ghost" onClick={handleSave} disabled={busy || !dirty}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Btn>
                <Btn
                  onClick={handleConfirm}
                  disabled={!dirty || busy || (needsConfirmation && !ready)}
                >
                  {approving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {confirmLabel}
                </Btn>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
