import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Copy,
  CalendarPlus,
  Loader2,
  PenLine,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { Application, Job } from '../../api/types';
import { formatDate, statusLabel } from '../../utils';
import { daysUntil, deadlineState } from '../../lib/deadlines';
import { cn } from '../../utils/cn';
import { StepHeader } from '../StepHeader';
import { Btn, Chip, EmptyState, Mono, Skeleton } from '../ui';

function statusTone(status: string): 'moss' | 'amber' | 'default' {
  if (status === 'APPROVED') {
    return 'moss';
  }
  if (status === 'PENDING_APPROVAL') {
    return 'amber';
  }
  return 'default';
}

function deadlineTone(kind: string): 'err' | 'amber' | 'default' {
  if (kind === 'overdue') {
    return 'err';
  }
  if (kind === 'today' || kind === 'soon') {
    return 'amber';
  }
  return 'default';
}

export function StepApprove({
  selectedJob,
  application,
  applications,
  drafting,
  deletingId,
  fallback,
  onDraft,
  onReview,
  onOpen,
  onDelete,
  onAddToCalendar,
  onBack,
  onNext,
}: {
  selectedJob: Job | null;
  application: Application | null;
  applications: Application[];
  drafting: boolean;
  deletingId: number | null;
  fallback: boolean;
  onDraft: () => void;
  onReview: () => void;
  onOpen: (application: Application) => void;
  onDelete: (application: Application) => void;
  onAddToCalendar: (application: Application) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [copied, setCopied] = useState<'cover' | 'resume' | null>(null);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async (kind: 'cover' | 'resume', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
    } catch {
      setCopied(null);
    }
  };

  const queue = useMemo(
    () =>
      [...applications].sort((a, b) => {
        const rank = (status: string) => (status === 'PENDING_APPROVAL' ? 0 : 1);
        const byStatus = rank(a.status) - rank(b.status);
        if (byStatus !== 0) {
          return byStatus;
        }
        // Pending drafts surface the soonest deadline first; undated last.
        if (a.status === 'PENDING_APPROVAL') {
          const aDays = daysUntil(a.deadline);
          const bDays = daysUntil(b.deadline);
          if (aDays !== null && bDays !== null && aDays !== bDays) {
            return aDays - bDays;
          }
          if (aDays === null && bDays !== null) {
            return 1;
          }
          if (aDays !== null && bDays === null) {
            return -1;
          }
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }),
    [applications],
  );

  const approved = application?.status === 'APPROVED';

  return (
    <section aria-labelledby="s3-title">
      <StepHeader
        n={3}
        title="Approve"
        sub={
          selectedJob
            ? `Drafting for ${selectedJob.title} at ${selectedJob.company}. The draft enters a pending state and stops there until you approve it.`
            : 'The Document Agent drafts a cover note and resume draft for one role. Nothing is sent anywhere.'
        }
      />

      {!selectedJob ? (
        <div className="mt-8">
          <EmptyState
            title="Pick a role first."
            body="The Document Agent drafts for one specific role. Choose a match in Step 02 and come back — the draft will be written against that listing and your resume facts."
            action={
              <Btn variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" /> Back to Step 02
              </Btn>
            }
          />
        </div>
      ) : drafting ? (
        <div className="mt-8 rounded-[6px] border border-line bg-card p-8" role="status" aria-label="Drafting documents">
          <p className="flex items-center gap-2 font-semibold">
            <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden="true" />
            {fallback ? 'Fallback drafter composing…' : 'Document Agent is drafting…'}
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <Skeleton className="h-4 w-1/3" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            </div>
            <div>
              <Skeleton className="h-4 w-1/3" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            </div>
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-inksoft">
            Checking every claim against resume facts
          </p>
        </div>
      ) : !application ? (
        <div className="mt-8 rounded-[6px] border-2 border-ink bg-card p-8 text-center">
          <PenLine className="mx-auto h-10 w-10 text-inksoft" aria-hidden="true" />
          <p className="mt-4 font-display text-2xl font-semibold">No draft yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-inksoft">
            The Document Agent will write a cover note and a tailored resume draft for{' '}
            <strong className="text-ink">{selectedJob.title}</strong>. Every claim will be grounded
            in your resume facts.
          </p>
          <Btn onClick={onDraft} className="mt-6 min-h-[52px] px-7">
            {fallback ? 'Draft with fallback templates' : 'Draft cover note & resume'}{' '}
            <ArrowRight className="h-5 w-5" />
          </Btn>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 rounded-[6px] border-2 px-5 py-4',
              approved ? 'border-moss bg-mossbg' : 'border-amber/60 bg-amberbg',
            )}
            role="status"
          >
            <div className="flex items-center gap-3">
              {approved ? (
                <ShieldCheck className="h-6 w-6 text-moss" aria-hidden="true" />
              ) : (
                <Clock3 className="h-6 w-6 text-amber" aria-hidden="true" />
              )}
              <div>
                <p className="font-semibold">
                  {approved ? 'Approved — decision recorded' : 'Pending your approval'}
                </p>
                <p className="text-[13px] text-inksoft">
                  {approved
                    ? `Recorded ${formatDate(application.updated_at)}. This records your decision only — nothing was submitted to ${application.company}.`
                    : 'This draft has not been sent anywhere. It will not move until you approve it.'}
                </p>
              </div>
            </div>
            {approved ? (
              <span className="stamp px-3 py-1.5 font-mono text-xs font-semibold uppercase text-moss">
                Approved · Not sent
              </span>
            ) : (
              <Chip tone="amber">Awaiting decision</Chip>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="flex flex-col rounded-[6px] border border-line bg-card">
              <header className="flex items-center justify-between border-b border-line px-5 py-3">
                <Mono className="font-semibold">Cover note</Mono>
                <button
                  onClick={() => copy('cover', application.cover_note)}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-[3px] px-2 text-xs font-medium text-inksoft hover:text-ink"
                  aria-label="Copy cover note"
                >
                  {copied === 'cover' ? (
                    <Check className="h-4 w-4 text-moss" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied === 'cover' ? 'Copied' : 'Copy'}
                </button>
              </header>
              <div className="max-h-[420px] flex-1 overflow-y-auto p-5">
                <p className="whitespace-pre-wrap text-sm leading-[1.75]">{application.cover_note}</p>
              </div>
            </article>
            <article className="flex flex-col rounded-[6px] border border-line bg-card">
              <header className="flex items-center justify-between border-b border-line px-5 py-3">
                <Mono className="font-semibold">Resume draft</Mono>
                <button
                  onClick={() => copy('resume', application.resume_draft)}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-[3px] px-2 text-xs font-medium text-inksoft hover:text-ink"
                  aria-label="Copy resume draft"
                >
                  {copied === 'resume' ? (
                    <Check className="h-4 w-4 text-moss" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied === 'resume' ? 'Copied' : 'Copy'}
                </button>
              </header>
              <div className="max-h-[420px] flex-1 overflow-y-auto p-5">
                <p className="whitespace-pre-wrap font-mono text-[13px] leading-[1.8]">
                  {application.resume_draft}
                </p>
              </div>
            </article>
          </div>

          <div className="rounded-[6px] border border-line bg-paper2/70 p-5">
            <Mono className="text-inksoft">Grounding check</Mono>
            <p className="mt-2 text-sm leading-relaxed">
              Every claim above should trace to a fact extracted in Step 01. If you cannot trace
              something to your resume, edit it out before approving.{' '}
              {fallback
                ? 'Fallback mode: wording is template-based; facts are unchanged.'
                : 'AI-assisted mode: wording is generated; facts are unchanged.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-sm text-inksoft">
              {approved
                ? 'Decision recorded. Copy the documents when you are ready to apply yourself — or practice first.'
                : 'Review both documents. Approval is a deliberate handoff — it records your decision and never submits anything.'}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Btn variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Btn>
              {approved ? (
                <Btn onClick={onNext} className="min-h-[52px] px-7">
                  Practice for this role <ArrowRight className="h-5 w-5" />
                </Btn>
              ) : (
                <Btn onClick={onReview} className="min-h-[52px] px-7">
                  Review for approval <ArrowRight className="h-5 w-5" />
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-12 border-t border-line pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Mono className="text-inksoft">Approval queue</Mono>
          <Mono className="text-inksoft">
            {queue.length} draft{queue.length === 1 ? '' : 's'} in this session
          </Mono>
        </div>

        {queue.length === 0 ? (
          <p className="mt-4 text-sm leading-relaxed text-inksoft">
            No drafts yet. Draft a role in Step 02 and it will appear here for review.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {queue.map((item) => {
              const isCurrent = application?.id === item.id;
              const deadline = deadlineState(item.deadline);
              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-3 px-1 py-3',
                    isCurrent && 'bg-card',
                  )}
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">{item.title}</span>
                      <Chip tone={statusTone(item.status)}>{statusLabel(item.status)}</Chip>
                      {deadline.kind !== 'none' ? (
                        <Chip tone={deadlineTone(deadline.kind)}>{deadline.label}</Chip>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-inksoft">
                      {item.company} · updated {formatDate(item.updated_at)}
                      {deadline.kind === 'none' ? ' · No deadline noted' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {deadline.kind !== 'none' ? (
                      <button
                        type="button"
                        onClick={() => onAddToCalendar(item)}
                        aria-label={`Add deadline for ${item.title} to your calendar`}
                        title="Add this deadline to your calendar"
                        className="flex min-h-[44px] items-center gap-1.5 rounded-[3px] px-2 text-xs font-medium text-inksoft hover:text-ink"
                      >
                        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Calendar</span>
                      </button>
                    ) : null}
                    <Btn
                      variant="ghost"
                      onClick={() => onOpen(item)}
                      className="min-h-[44px] px-3 text-xs"
                    >
                      {item.status === 'APPROVED' ? 'Open' : 'Review'}
                    </Btn>
                    <button
                      onClick={() => onDelete(item)}
                      disabled={deletingId === item.id}
                      aria-label={`Delete draft for ${item.title}`}
                      title="Delete this draft"
                      className="flex h-11 w-11 items-center justify-center rounded-[3px] border border-line text-inksoft transition-colors hover:border-err hover:text-err disabled:opacity-40"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
