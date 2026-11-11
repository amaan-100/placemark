"""Deadline reminder derivation.

Everything here works on ``YYYY-MM-DD`` calendar dates, never timestamps. The
deadline column is a date-only string, so doing the arithmetic on dates removes
any server/client timezone drift by construction: the same stored value yields
the same bucket everywhere.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone

SOON_WINDOW_DAYS = 7

DATE_FORMAT = "%Y-%m-%d"


@dataclass(frozen=True)
class Reminder:
    application_id: int
    title: str
    company: str
    deadline: str
    days_left: int
    kind: str


def parse_deadline(value: str | None) -> date | None:
    """Parse a stored deadline into a plain calendar date."""
    if not value:
        return None
    text = value.strip()
    if not text:
        return None
    try:
        return datetime.strptime(text[:10], DATE_FORMAT).date()
    except ValueError:
        return None


def classify(days_left: int) -> str:
    if days_left < 0:
        return "overdue"
    if days_left == 0:
        return "today"
    if days_left <= SOON_WINDOW_DAYS:
        return "soon"
    return "later"


def days_left(target: date, today: date) -> int:
    return (target - today).days


def today_utc() -> date:
    return datetime.now(timezone.utc).date()


def build_reminders(rows, today: date | None = None) -> list[Reminder]:
    """Turn application rows into reminders, soonest first.

    Undated applications are skipped: there is nothing to be reminded about.
    """
    current = today or today_utc()
    items: list[Reminder] = []
    for row in rows:
        target = parse_deadline(row.deadline)
        if target is None:
            continue
        remaining = days_left(target, current)
        items.append(
            Reminder(
                application_id=row.id,
                title=row.title,
                company=row.company,
                deadline=target.isoformat(),
                days_left=remaining,
                kind=classify(remaining),
            )
        )
    items.sort(key=lambda item: (item.days_left, item.application_id))
    return items


def summarize(items: list[Reminder]) -> tuple[int, int]:
    """Return (overdue, due_soon) counts for the banner headline."""
    overdue = sum(1 for item in items if item.kind == "overdue")
    due_soon = sum(1 for item in items if item.kind in ("today", "soon"))
    return overdue, due_soon
