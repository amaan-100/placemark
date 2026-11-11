import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlarmClock, X } from 'lucide-react';
import type { ReminderList } from '../api/types';
import { cn } from '../utils/cn';

const SNOOZE_KEY = 'pc_reminders_snoozed_until';
const SEEN_STATE_KEY = 'pc_reminders_seen_state';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Private mode or storage disabled: the banner just stays visible.
  }
}

/** Midnight at the start of the next local calendar day. */
function nextMidnight(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime();
}

/**
 * Identity of the current deadline situation. The banner reappears when this
 * changes, so "hide" means "stop telling me about this state", not "never warn
 * me about a new overdue application".
 */
function situationKey(reminders: ReminderList): string {
  const urgent = reminders.items
    .filter((item) => item.kind === 'overdue' || item.kind === 'today' || item.kind === 'soon')
    .map((item) => item.application_id)
    .sort((a, b) => a - b);
  return `${reminders.overdue}:${urgent.join(',')}`;
}

export function ReminderBanner({
  reminders,
  onReview,
}: {
  reminders: ReminderList | null;
  onReview: () => void;
}) {
  const [snoozedUntil, setSnoozedUntil] = useState<number>(() => {
    const raw = read(SNOOZE_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const [hiddenState, setHiddenState] = useState<string | null>(() => read(SEEN_STATE_KEY));
  const [now, setNow] = useState(() => Date.now());

  // Re-evaluate once the snooze expires without requiring a reload.
  useEffect(() => {
    if (now < snoozedUntil) {
      const timer = window.setTimeout(() => setNow(Date.now()), snoozedUntil - now + 1000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [now, snoozedUntil]);

  const key = useMemo(() => (reminders ? situationKey(reminders) : ''), [reminders]);

  const snooze = useCallback(() => {
    const until = nextMidnight();
    write(SNOOZE_KEY, String(until));
    setSnoozedUntil(until);
  }, []);

  const hideForThisSituation = useCallback(() => {
    write(SEEN_STATE_KEY, key);
    setHiddenState(key);
  }, [key]);

  if (!reminders || reminders.total === 0) {
    return null;
  }

  const urgent = reminders.overdue + reminders.due_soon;
  if (urgent === 0) {
    return null;
  }
  if (now < snoozedUntil) {
    return null;
  }
  if (hiddenState !== null && hiddenState === key) {
    return null;
  }

  const parts: string[] = [];
  if (reminders.overdue > 0) {
    parts.push(`${reminders.overdue} overdue`);
  }
  if (reminders.due_soon > 0) {
    parts.push(`${reminders.due_soon} due within 7 days`);
  }
  const headline = parts.join(' · ');

  return (
    <div
      className={cn(
        'border-t border-line bg-card px-4 py-2.5 sm:px-6 lg:px-10',
        reminders.overdue > 0 && 'border-t-2 border-t-err/40 bg-errbg/40',
      )}
      role="status"
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2">
        <AlarmClock
          className={cn(
            'h-4 w-4 shrink-0',
            reminders.overdue > 0 ? 'text-err' : 'text-amber',
          )}
          aria-hidden="true"
        />
        <p className="text-[13px] font-medium">
          {headline}
          <span className="hidden text-inksoft sm:inline">
            {' '}
            — add the next one to your calendar.
          </span>
        </p>

        <button
          type="button"
          onClick={onReview}
          className="min-h-[44px] rounded-[3px] px-2 text-[13px] font-semibold text-accentdark underline underline-offset-2 hover:text-ink"
        >
          Review deadlines
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={snooze}
            className="min-h-[44px] rounded-[3px] px-2 text-xs font-medium text-inksoft hover:text-ink"
          >
            Dismiss for today
          </button>
          <button
            type="button"
            onClick={hideForThisSituation}
            className="hidden min-h-[44px] rounded-[3px] px-2 text-xs font-medium text-inksoft hover:text-ink sm:inline-flex sm:items-center"
          >
            Don&rsquo;t show again
          </button>
          <button
            type="button"
            onClick={snooze}
            aria-label="Dismiss reminders until tomorrow"
            title="Dismiss until tomorrow"
            className="flex h-11 w-11 items-center justify-center rounded-[3px] border border-line text-inksoft hover:border-ink hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mx-auto mt-1 flex max-w-[1600px] justify-end sm:hidden">
        <button
          type="button"
          onClick={hideForThisSituation}
          className="min-h-[44px] px-2 text-[11px] font-medium text-inksoft underline underline-offset-2"
        >
          Don&rsquo;t show this reminder again
        </button>
      </div>
    </div>
  );
}
