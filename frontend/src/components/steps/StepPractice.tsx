import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  InterviewAnswerResponse,
  InterviewDetailResponse,
  InterviewStart,
  InterviewSummaryOut,
  InterviewTurnOut,
  Job,
} from '../../api/types';
import { formatDate } from '../../utils';
import { cn } from '../../utils/cn';
import { StepHeader } from '../StepHeader';
import { Btn, Chip, EASE, EmptyState, Mono, ScoreBar } from '../ui';

const RUBRIC_WEIGHTS: Array<{ key: string; label: string; weight: number; note: string }> = [
  { key: 'relevance', label: 'Relevance', weight: 30, note: 'Does the answer address the question and the role?' },
  { key: 'structure', label: 'Structure', weight: 25, note: 'Is there a clear beginning, middle, and end?' },
  { key: 'evidence', label: 'Evidence', weight: 25, note: 'Are there concrete examples, data, or outcomes?' },
  { key: 'accuracy', label: 'Accuracy', weight: 20, note: 'Are the technical claims correct and specific?' },
];

function rubricEntries(rubric: Record<string, unknown>): Array<[string, number]> {
  return Object.entries(rubric).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  );
}

export function StepPractice({
  approved,
  selectedJob,
  interview,
  currentQuestion,
  answer,
  setAnswer,
  evaluation,
  turns,
  weakAreas,
  interviewComplete,
  starting,
  evaluating,
  history,
  expandedId,
  details,
  fallback,
  onStart,
  onSubmit,
  onNext,
  onToggleHistory,
  onBack,
}: {
  approved: boolean;
  selectedJob: Job | null;
  interview: InterviewStart | null;
  currentQuestion: string | null;
  answer: string;
  setAnswer: (value: string) => void;
  evaluation: InterviewAnswerResponse | null;
  turns: InterviewTurnOut[];
  weakAreas: string[];
  interviewComplete: boolean;
  starting: boolean;
  evaluating: boolean;
  history: InterviewSummaryOut[];
  expandedId: number | null;
  details: Record<number, InterviewDetailResponse>;
  fallback: boolean;
  onStart: () => void;
  onSubmit: () => void;
  onNext: () => void;
  onToggleHistory: (id: number) => void;
  onBack: () => void;
}) {
  const reduce = useReducedMotion();
  const maxTurns = interview?.max_turns ?? 3;
  const answered = turns.filter((turn) => turn.answer !== null);
  const reviewedTurn = evaluation ? answered[answered.length - 1] : undefined;
  const turnIndex = evaluation
    ? Math.max(1, answered.length)
    : Math.min(answered.length + 1, maxTurns);
  const shownQuestion = reviewedTurn?.question ?? currentQuestion;
  const finalTurn = answered[answered.length - 1];
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const ready = answer.trim().length >= 20;

  const historyBlock = (
    <div className="mt-10 border-t border-line pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Mono className="text-inksoft">Recent practice</Mono>
        <Mono className="text-inksoft">
          {history.length} run{history.length === 1 ? '' : 's'} this session
        </Mono>
      </div>
      {history.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-inksoft">
          No practice runs yet. Each run is scored against the same rubric and kept here for
          comparison.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {history.map((item) => {
            const expanded = expandedId === item.id;
            const detail = details[item.id];
            return (
              <li key={item.id}>
                <button
                  onClick={() => onToggleHistory(item.id)}
                  aria-expanded={expanded}
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-1 py-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.goal}</p>
                    <p className="mt-0.5 text-xs text-inksoft">
                      {formatDate(item.created_at)} · {item.turn_count}/{item.max_turns} questions ·
                      status {item.status.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.weak_areas.slice(0, 2).map((area) => (
                      <Chip key={area} tone="amber">
                        {area}
                      </Chip>
                    ))}
                    <ChevronDown
                      className={cn('h-4 w-4 text-inksoft transition-transform', expanded && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </div>
                </button>
                {expanded ? (
                  <div className="space-y-3 px-1 pb-4">
                    {!detail ? (
                      <p className="text-xs text-inksoft">Loading transcript…</p>
                    ) : (
                      detail.turns.map((turn) => (
                        <div key={turn.id} className="rounded-[3px] border border-line bg-paper p-3">
                          <p className="text-[13px] font-medium">
                            Q{turn.turn_index + 1}. {turn.question}
                          </p>
                          {turn.answer ? (
                            <p className="mt-1 text-[13px] leading-relaxed text-inksoft">
                              {turn.answer}
                            </p>
                          ) : null}
                          {turn.score != null ? (
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-inksoft">
                              Score {turn.score}/100
                            </p>
                          ) : null}
                          {turn.feedback ? (
                            <p className="mt-1 text-[13px] leading-relaxed text-inksoft">
                              {turn.feedback}
                            </p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (!approved) {
    return (
      <section aria-labelledby="s4-title">
        <StepHeader
          n={4}
          title="Practice"
          sub="The Interview Agent asks one role-specific question at a time and scores your answer against a rubric."
        />
        <div className="mt-8">
          <EmptyState
            title="Approval unlocks practice."
            body="Practice is tied to the role you approved. Once your decision is recorded in Step 03, the Interview Agent will drill you on that specific role — one question at a time, with rubric feedback."
            action={
              <Btn variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" /> Back to Step 03
              </Btn>
            }
          />
        </div>
        {historyBlock}
      </section>
    );
  }

  return (
    <section aria-labelledby="s4-title">
      <StepHeader
        n={4}
        title="Practice"
        sub={
          selectedJob
            ? `Drilling for ${selectedJob.title} at ${selectedJob.company}. One question at a time — answer in your own words.`
            : 'One question at a time — answer in your own words and get rubric feedback.'
        }
      />

      {!interview ? (
        <div className="mt-8 rounded-[6px] border-2 border-ink bg-card p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-accent" aria-hidden="true" />
          <p className="mt-4 font-display text-2xl font-semibold">Ready to rehearse.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-inksoft">
            The Interview Agent will ask {maxTurns} questions about{' '}
            <strong className="text-ink">{selectedJob?.title ?? 'this role'}</strong> and score each
            answer against relevance, structure, evidence, and accuracy.
          </p>
          <Btn onClick={onStart} disabled={starting} className="mt-6 min-h-[52px] px-7">
            {starting ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            )}
            {starting ? 'Preparing…' : 'Start practice'}
          </Btn>
        </div>
      ) : interviewComplete && !evaluation ? (
        <div className="mt-8 space-y-6">
          <div className="rounded-[6px] border-2 border-moss bg-mossbg p-6" role="status">
            <p className="flex items-center gap-2 font-display text-xl font-semibold text-moss">
              <ShieldCheck className="h-6 w-6" /> Practice set complete.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              You answered all {maxTurns} questions for {selectedJob?.title ?? 'this role'}. Your
              approved draft is still in Step 03 — copy it whenever you are ready to apply yourself.
              Nothing has been sent on your behalf.
            </p>
            {finalTurn?.score != null ? (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div>
                  <Mono className="text-inksoft">Final answer</Mono>
                  <p className="font-display text-2xl font-semibold">
                    {finalTurn.score}
                    <span className="text-base text-inksoft">/100</span>
                  </p>
                </div>
                <ScoreBar score={finalTurn.score} className="w-40" />
                {finalTurn.feedback ? (
                  <p className="max-w-lg text-sm leading-relaxed text-ink">{finalTurn.feedback}</p>
                ) : null}
              </div>
            ) : null}
            {weakAreas.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Mono className="text-inksoft">Rehearse next</Mono>
                {weakAreas.map((area) => (
                  <Chip key={area} tone="amber">
                    {area}
                  </Chip>
                ))}
              </div>
            ) : null}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Btn onClick={onStart} variant="ink" disabled={starting}>
                {starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                )}
                Practice again
              </Btn>
              <Btn variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" /> Back to Step 03
              </Btn>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2" aria-label="Practice progress">
            {Array.from({ length: maxTurns }, (_, index) => {
              const done = index < answered.length;
              const current = !evaluation && index === answered.length;
              return (
                <span
                  key={index}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
                    done
                      ? 'border-moss bg-mossbg text-moss'
                      : current
                        ? 'border-accent bg-accent/10 text-accentdark'
                        : 'border-line text-inksoft',
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : current ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                  Q{index + 1}
                </span>
              );
            })}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="rounded-[6px] border-2 border-ink bg-card p-6 sm:p-8">
              <Mono className="text-accentdark">
                Question {turnIndex} of {maxTurns}
              </Mono>
              <p className="mt-3 font-display text-2xl font-semibold leading-snug sm:text-[1.7rem]">
                {shownQuestion ?? 'Preparing the next question…'}
              </p>

              {turns.length > 0 ? (
                <details className="mt-5 rounded-[3px] border border-line bg-paper px-4 py-3">
                  <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-inksoft">
                    Transcript · {answered.length} answered
                  </summary>
                  <div className="mt-3 space-y-3">
                    {turns.map((turn) => (
                      <div key={turn.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                        <p className="text-[13px] font-medium">
                          Q{turn.turn_index + 1}. {turn.question}
                        </p>
                        {turn.answer ? (
                          <p className="mt-1 text-[13px] leading-relaxed text-inksoft">
                            {turn.answer}
                          </p>
                        ) : null}
                        {turn.score != null ? (
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-inksoft">
                            Score {turn.score}/100
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              {!evaluation ? (
                <div className="mt-6">
                  <label htmlFor="answer" className="text-sm font-medium">
                    Your answer
                  </label>
                  <textarea
                    id="answer"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    rows={6}
                    placeholder="Answer out loud in your head first, then type it here. Aim for 3–5 sentences with a concrete example."
                    className="mt-2 w-full rounded-[3px] border border-linedark bg-paper p-4 text-[15px] leading-relaxed focus:border-accent"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-inksoft">
                      {words} word{words === 1 ? '' : 's'} · min 20 characters
                    </p>
                    <Btn onClick={onSubmit} disabled={evaluating || !ready} className="min-h-[48px] px-6">
                      {evaluating ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                      )}
                      {evaluating ? 'Scoring…' : 'Get rubric feedback'}
                    </Btn>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="mt-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-line bg-paper p-4">
                    <div>
                      <Mono className="text-inksoft">Rubric score</Mono>
                      <p className="font-display text-3xl font-semibold">
                        {evaluation.score}
                        <span className="text-lg text-inksoft">/100</span>
                      </p>
                    </div>
                    <ScoreBar score={evaluation.score} className="w-40" />
                  </div>

                  {rubricEntries(evaluation.rubric).length > 0 ? (
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      {rubricEntries(evaluation.rubric).map(([dimension, value]) => (
                        <div key={dimension} className="rounded-[3px] border border-line bg-card p-3">
                          <div className="flex items-center justify-between">
                            <dt className="text-xs font-semibold capitalize">{dimension}</dt>
                            <dd className="font-mono text-xs">{value}</dd>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/70">
                            <div
                              className="h-full rounded-full bg-moss"
                              style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  <p className="mt-4 text-sm leading-relaxed">{evaluation.feedback}</p>

                  {weakAreas.length > 0 ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Mono className="text-inksoft">Focus next</Mono>
                      {weakAreas.map((area) => (
                        <Chip key={area} tone="amber">
                          {area}
                        </Chip>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Btn onClick={onNext} className="min-h-[48px] px-6">
                      {evaluation.next_question ? (
                        <>
                          Next question <ArrowRight className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          View results <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Btn>
                  </div>
                </motion.div>
              )}
            </div>

            <aside className="h-fit rounded-[6px] border border-line bg-card p-5" aria-label="Scoring rubric">
              <Mono className="text-inksoft">Rubric — how this is scored</Mono>
              <dl className="mt-4 space-y-4">
                {RUBRIC_WEIGHTS.map((item) => (
                  <div key={item.key} className="border-b border-line pb-4 last:border-0 last:pb-0">
                    <dt className="flex items-center justify-between text-sm font-semibold">
                      {item.label}
                      <span className="font-mono text-[10px] text-inksoft">{item.weight}%</span>
                    </dt>
                    <dd className="mt-1 text-[13px] leading-relaxed text-inksoft">{item.note}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 rounded-[4px] bg-paper2/80 p-3 text-[12px] leading-relaxed text-inksoft">
                {fallback
                  ? 'Fallback mode: scores use deterministic heuristics on length, specificity markers, and structure.'
                  : 'AI-assisted mode: scores compare your answer against the rubric criteria above.'}
              </p>
              {weakAreas.length > 0 ? (
                <div className="mt-4">
                  <Mono className="text-inksoft">Weak areas</Mono>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {weakAreas.map((area) => (
                      <Chip key={area} tone="amber">
                        {area}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      )}

      {historyBlock}
    </section>
  );
}
