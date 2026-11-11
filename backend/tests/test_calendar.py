"""Calendar export and deadline reminder derivation."""

from datetime import date

import pytest

from app.services.calendar import build_deadline_ics, slugify
from app.services.reminders import build_reminders, classify, parse_deadline


class _Row:
    """Minimal stand-in for an Application row."""

    def __init__(self, row_id: int, title: str, company: str, deadline: str | None):
        self.id = row_id
        self.title = title
        self.company = company
        self.deadline = deadline


# ---------------------------------------------------------------- ICS export


def test_ics_has_required_structure_and_crlf():
    ics = build_deadline_ics(
        application_id=7,
        session_id="11111111-1111-1111-1111-111111111111",
        title="Backend Intern",
        company="Acme Corp",
        deadline=date(2026, 11, 15),
    )
    raw = ics.encode("utf-8")

    # The spec requires CRLF; a bare LF makes some clients reject the file.
    assert b"\r\n" in raw
    assert b"\n" not in raw.replace(b"\r\n", b"")

    text = ics.replace("\r\n ", "")  # unfold before asserting on content
    assert text.startswith("BEGIN:VCALENDAR\r\n")
    assert text.rstrip().endswith("END:VCALENDAR")
    assert "BEGIN:VEVENT" in text
    assert "END:VEVENT" in text
    assert "DTSTART;VALUE=DATE:20261115" in text
    # All-day DTEND is exclusive.
    assert "DTEND;VALUE=DATE:20261116" in text
    assert "PRODID:-//Placemark//Application deadline//EN" in text


def test_ics_contains_both_alarms():
    ics = build_deadline_ics(
        application_id=1,
        session_id="sid",
        title="Role",
        company="Co",
        deadline=date(2026, 12, 1),
    )
    assert "TRIGGER:-P3D" in ics
    assert "TRIGGER:-P1D" in ics
    assert ics.count("BEGIN:VALARM") == 2
    assert ics.count("END:VALARM") == 2


def test_ics_uid_is_stable_across_exports():
    kwargs = dict(
        application_id=42,
        session_id="sid",
        title="Role",
        company="Co",
        deadline=date(2026, 12, 1),
    )
    first = build_deadline_ics(**kwargs)
    second = build_deadline_ics(**kwargs)
    uid_lines = {
        line for line in first.splitlines() if line.startswith("UID:")
    }
    assert len(uid_lines) == 1
    assert uid_lines == {line for line in second.splitlines() if line.startswith("UID:")}


def test_ics_escapes_special_characters():
    ics = build_deadline_ics(
        application_id=1,
        session_id="sid",
        title="Engineer, Platform; Core",
        company="Acme\\Beta",
        deadline=date(2026, 12, 1),
    )
    text = ics.replace("\r\n ", "")
    assert r"Engineer\, Platform\; Core" in text
    assert r"Acme\\Beta" in text


def test_slugify_is_filesystem_safe():
    assert slugify("Acme / Co. (Ltd.)") == "acme-co-ltd"
    assert slugify("   ") == "application"
    assert slugify("A" * 100).startswith("a" * 48)
    assert "/" not in slugify("a/b")


# ------------------------------------------------------------- reminder math


@pytest.mark.parametrize(
    ("days", "expected"),
    [(-3, "overdue"), (-1, "overdue"), (0, "today"), (1, "soon"), (7, "soon"), (8, "later")],
)
def test_classify_boundaries(days, expected):
    assert classify(days) == expected


def test_parse_deadline_rejects_junk():
    assert parse_deadline(None) is None
    assert parse_deadline("") is None
    assert parse_deadline("   ") is None
    assert parse_deadline("not-a-date") is None
    assert parse_deadline("2026-11-15") == date(2026, 11, 15)
    # A datetime string still resolves to its calendar date.
    assert parse_deadline("2026-11-15T00:00:00Z") == date(2026, 11, 15)


def test_build_reminders_skips_undated_and_sorts_soonest_first():
    rows = [
        _Row(1, "Later", "Co", "2026-12-20"),
        _Row(2, "Overdue", "Co", "2026-11-01"),
        _Row(3, "No deadline", "Co", None),
        _Row(4, "Today", "Co", "2026-11-11"),
    ]
    items = build_reminders(rows, today=date(2026, 11, 11))

    assert [item.application_id for item in items] == [2, 4, 1]
    assert items[0].kind == "overdue"
    assert items[0].days_left == -10
    assert items[1].kind == "today"
    assert items[2].kind == "later"


def test_build_reminders_empty_is_safe():
    assert build_reminders([], today=date(2026, 11, 11)) == []
