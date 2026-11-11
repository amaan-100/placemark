import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Trace } from '../api/types';
import { AGENT_META, toAgentId, traceLabel, traceTime } from '../lib/agents';
import { formatLatency, summarizeTrace } from '../utils';
import { cn } from '../utils/cn';
import { EASE, Mono, Skeleton } from './ui';

export function TraceRail({
  traces,
  fallback,
  checking,
  unknown,
  compact,
  loading,
}: {
  traces: Trace[];
  fallback: boolean;
  checking?: boolean;
  unknown?: boolean;
  compact?: boolean;
  loading?: boolean;
}) {
  const reduce = useReducedMotion();
  const ordered = [...traces].sort((a, b) => {
    const byTime = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return Number.isNaN(byTime) || byTime === 0 ? a.id - b.id : byTime;
  });

  return (
    <aside aria-label="Agent activity trace" className={cn('flex flex-col', compact ? 'h-full' : 'h-full')}>
      {compact ? null : (
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <Mono className="text-ink">Agent trace</Mono>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider',
              checking || unknown ? 'text-inksoft' : fallback ? 'text-amber' : 'text-moss',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                checking || unknown ? 'bg-linedark' : fallback ? 'bg-amber' : 'bg-moss',
              )}
            />
            {unknown
              ? 'AI status unknown'
              : checking
                ? 'Checking AI'
                : fallback
                  ? 'Fallback mode'
                  : 'AI-assisted'}
          </span>
        </div>
      )}
      <div
        className="relative flex-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label="Agent activity log"
      >
        {loading && ordered.length === 0 ? (
          <div className="space-y-4 pl-8">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : ordered.length === 0 ? (
          <p className="pl-8 text-[13px] leading-relaxed text-inksoft">
            No agent activity yet. Every action you take will appear here with its latency and
            mode.
          </p>
        ) : (
          <ol className="relative space-y-4">
            <AnimatePresence initial={false}>
              {ordered.map((trace, index) => {
                const agent = toAgentId(trace.agent);
                const meta = AGENT_META[agent];
                const isLast = index === ordered.length - 1;
                return (
                  <motion.li
                    key={trace.id}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="relative pl-8"
                  >
                    {!isLast ? (
                      <span
                        className="absolute bottom-[-17px] left-[7px] top-[17px] w-px bg-line"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span
                      className="absolute left-0 top-0.5 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 bg-paper"
                      style={{ borderColor: meta.color }}
                      aria-hidden="true"
                    >
                      <span className="h-[5px] w-[5px] rounded-full" style={{ background: meta.color }} />
                    </span>
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className="font-mono text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: meta.color }}
                      >
                        {meta.name}
                      </span>
                      <span className="font-mono text-[10px] text-inksoft">{traceTime(trace)}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] font-medium leading-snug">{traceLabel(trace)}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-inksoft">
                      {summarizeTrace(trace.output ?? {}, trace.action)}
                    </p>
                    <p className="mt-1.5 font-mono text-[10px] text-inksoft">
                      {formatLatency(trace.latency_ms)}
                    </p>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
        )}
      </div>
      <div className="border-t border-line px-4 py-3">
        <p className="text-[11px] leading-relaxed text-inksoft">
          Every entry is a real step the agents took. Each step is timed. Nothing here is sent to
          an employer.
        </p>
      </div>
    </aside>
  );
}
