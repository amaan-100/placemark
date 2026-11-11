export type DeadlineKind = 'none' | 'overdue' | 'today' | 'soon' | 'later';

export type DeadlineState = {
  kind: DeadlineKind;
  days: number | null;
  label: string;
  date: Date | null;
};

const DAY_MS = 86_400_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Local noon keeps the calendar day stable across UTC parsing and DST shifts.
export function parseDeadline(value: string | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  if (DATE_ONLY.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const normalized = new Date(parsed);
  normalized.setHours(12, 0, 0, 0);
  return normalized;
}

export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function localMidnight(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daysUntil(value: string | null | undefined, now?: Date): number | null {
  const target = parseDeadline(value);
  if (target === null) {
    return null;
  }
  return Math.round((localMidnight(target) - localMidnight(now ?? new Date())) / DAY_MS);
}

export function deadlineState(value: string | null | undefined, now?: Date): DeadlineState {
  const date = parseDeadline(value);
  if (date === null) {
    return { kind: 'none', days: null, label: 'No deadline noted', date: null };
  }
  const days = daysUntil(value, now);
  if (days === null) {
    return { kind: 'none', days: null, label: 'No deadline noted', date: null };
  }
  if (days === 0) {
    return { kind: 'today', days, label: 'Due today', date };
  }
  if (days < 0) {
    const count = Math.abs(days);
    const label = count === 1 ? 'Overdue by 1 day' : `Overdue by ${count} days`;
    return { kind: 'overdue', days, label, date };
  }
  if (days <= 7) {
    const label = days === 1 ? 'Due in 1 day' : `Due in ${days} days`;
    return { kind: 'soon', days, label, date };
  }
  const formatted = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
  return { kind: 'later', days, label: `Apply by ${formatted}`, date };
}

export function formatDeadline(value: string | null | undefined, now?: Date): string {
  return deadlineState(value, now).label;
}

export function isDueSoon(
  value: string | null | undefined,
  withinDays = 7,
  now?: Date,
): boolean {
  const days = daysUntil(value, now);
  if (days === null) {
    return false;
  }
  return days >= 0 && days <= withinDays;
}
