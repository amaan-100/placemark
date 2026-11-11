import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Loader2, MapPin, Search } from 'lucide-react';
import type { Job } from '../../api/types';
import { sourceLabel } from '../../utils';
import { deadlineState } from '../../lib/deadlines';
import { cn } from '../../utils/cn';
import { StepHeader } from '../StepHeader';
import { Btn, Chip, EASE, EmptyState, Mono, ScoreBar, Skeleton } from '../ui';

const SUGGESTIONS = [
  'Cybersecurity internship',
  'Python developer',
  'Data analyst',
  'Product intern',
];

export function StepMatches({
  hasResume,
  searching,
  searched,
  query,
  setQuery,
  location,
  setLocation,
  jobs,
  source,
  cached,
  selected,
  onPick,
  onSearch,
  onDraft,
  draftingJobId,
  fallback,
  onBack,
  onNext,
}: {
  hasResume: boolean;
  searching: boolean;
  searched: boolean;
  query: string;
  setQuery: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  jobs: Job[];
  source: string;
  cached: boolean;
  selected: Job | null;
  onPick: (job: Job) => void;
  onSearch: () => void;
  onDraft: (job: Job) => void;
  draftingJobId: number | null;
  fallback: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const reduce = useReducedMotion();
  const ranked = useMemo(
    () => [...jobs].sort((a, b) => b.match_score - a.match_score),
    [jobs],
  );

  if (!hasResume) {
    return (
      <section aria-labelledby="s2-title">
        <StepHeader
          n={2}
          title="Matches"
          sub="The Job Agent searches live listings and ranks them against your profile."
        />
        <div className="mt-8">
          <EmptyState
            title="Your profile comes first."
            body="The Job Agent ranks listings against the skills extracted from your resume. Upload your resume in Step 01 and it will know what to look for."
            action={
              <Btn variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" /> Back to Step 01
              </Btn>
            }
          />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="s2-title">
      <StepHeader
        n={2}
        title="Matches"
        sub="Live listings, filtered against your query and ranked against your resume. Only relevant roles are shown."
      />

      <form
        className="mt-8 grid gap-3 rounded-[6px] border border-line bg-card p-4 sm:grid-cols-[1fr_180px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <div>
          <label htmlFor="mq" className="sr-only">
            Role query
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inksoft"
              aria-hidden="true"
            />
            <input
              id="mq"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Role query, e.g. cybersecurity internship"
              className="min-h-[44px] w-full rounded-[3px] border border-linedark bg-paper pl-9 pr-3 text-sm focus:border-accent"
            />
          </div>
        </div>
        <div>
          <label htmlFor="mloc" className="sr-only">
            Location
          </label>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inksoft"
              aria-hidden="true"
            />
            <input
              id="mloc"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Anywhere"
              className="min-h-[44px] w-full rounded-[3px] border border-linedark bg-paper pl-9 pr-3 text-sm focus:border-accent"
            />
          </div>
        </div>
        <Btn type="submit" disabled={searching} className="min-h-[44px]">
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          {searching ? 'Searching…' : 'Search listings'}
        </Btn>
      </form>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Suggested searches">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setQuery(suggestion)}
            className="min-h-[44px] rounded-full border border-line bg-card px-4 py-2 text-xs text-inksoft transition-colors hover:border-linedark hover:text-ink"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {searching ? (
        <div className="mt-6 space-y-3" role="status" aria-label="Searching listings">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[6px] border border-line bg-card p-5">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </div>
          ))}
          <p className="font-mono text-[11px] uppercase tracking-wider text-inksoft">
            {fallback ? 'Fallback ranker scoring listings…' : 'Job Agent scanning live listings…'}
          </p>
        </div>
      ) : null}

      {searched && !searching ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Mono className="text-inksoft">
              {ranked.length} relevant role{ranked.length === 1 ? '' : 's'} · ranked by fit
            </Mono>
            <div className="flex flex-wrap items-center gap-2">
              {source ? <Chip>{sourceLabel(source)}</Chip> : null}
              {cached ? <Chip tone="amber">Cached result</Chip> : null}
              {fallback ? <Chip tone="amber">Deterministic scores</Chip> : null}
            </div>
          </div>

          <ol className="mt-4 space-y-3">
            {ranked.map((job, index) => {
              const isSelected = selected?.id === job.id;
              const deadline = job.deadline ? deadlineState(job.deadline) : null;
              return (
                <motion.li
                  key={job.id}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : index * 0.06, duration: 0.4, ease: EASE }}
                  className={cn(
                    'rounded-[6px] border-2 bg-card transition-colors',
                    isSelected ? 'border-accent' : 'border-line hover:border-linedark',
                  )}
                >
                  <button
                    onClick={() => onPick(job)}
                    aria-pressed={isSelected}
                    className="block w-full p-5 text-left"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-inksoft">
                            #{index + 1}
                          </span>
                          <span className="font-display text-xl font-semibold leading-snug">
                            {job.title}
                          </span>
                          {isSelected ? (
                            <Chip tone="accent">
                              <Check className="h-3 w-3" /> Selected
                            </Chip>
                          ) : null}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-inksoft">
                          <span>{job.company}</span>
                          {job.location ? <span aria-hidden="true">·</span> : null}
                          {job.location ? <span>{job.location}</span> : null}
                          {deadline ? <span aria-hidden="true">·</span> : null}
                          {deadline ? <span>{deadline.label}</span> : null}
                        </p>
                      </div>
                      <div className="text-right">
                        <ScoreBar score={job.match_score} />
                        <Mono className="mt-1 block text-inksoft">Match</Mono>
                      </div>
                    </div>
                    {job.skills.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {job.skills.slice(0, 8).map((skill) => (
                          <Chip key={`${job.id}-${skill}`}>{skill}</Chip>
                        ))}
                      </div>
                    ) : null}
                  </button>
                  {job.url ? (
                    <div className="border-t border-line px-5 py-3">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-accentdark hover:underline"
                      >
                        View original listing <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ) : null}
                </motion.li>
              );
            })}
          </ol>

          {ranked.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No roles match that search."
                body="Try a broader query or clear the location. The Job Agent only shows roles it can defend as relevant — an empty list is better than a misleading one."
              />
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-inksoft">
              {selected ? (
                <>
                  Selected: <strong className="text-ink">{selected.title}</strong>. The Document
                  Agent will draft for this role.
                </>
              ) : (
                'Select a role to continue — the draft is written for one role at a time.'
              )}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Btn variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Btn>
              <Btn
                onClick={() => (selected ? onDraft(selected) : onNext())}
                disabled={!selected || draftingJobId !== null}
                className="min-h-[52px] px-7"
              >
                {draftingJobId !== null ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                )}
                {draftingJobId !== null ? 'Drafting…' : 'Draft for this role'}
              </Btn>
            </div>
          </div>
        </div>
      ) : null}

      {!searched && !searching ? (
        <div className="mt-6">
          <EmptyState
            title="Ready to search."
            body="Run a search to see live listings ranked against your resume. If the live feed is unavailable, a deterministic mock feed keeps the flow working."
          />
        </div>
      ) : null}
    </section>
  );
}
