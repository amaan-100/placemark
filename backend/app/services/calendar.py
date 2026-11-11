"""RFC 5545 calendar export for application deadlines.

Hand-built rather than pulled from a library: the surface we need is one
all-day VEVENT with two alarms, and a dependency would bring more code than it
saves. Correctness details that matter and are easy to get wrong:

* line breaks are CRLF, as the spec requires;
* an all-day event uses ``DTSTART;VALUE=DATE`` with a bare ``YYYYMMDD``;
* text values escape backslash, semicolon, comma, and newline;
* UID must be stable so re-importing updates the event instead of duplicating.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

PRODID = "-//Placemark//Application deadline//EN"
CRLF = "\r\n"

# Days before the deadline on which the calendar app fires an alarm.
ALARM_DAYS_BEFORE = (3, 1)


def _escape_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", r"\;")
        .replace(",", r"\,")
        .replace("\r\n", r"\n")
        .replace("\n", r"\n")
        .replace("\r", r"\n")
    )


def _fold(line: str) -> str:
    """Fold a content line at 75 octets, continuing with a single space."""
    encoded = line.encode("utf-8")
    if len(encoded) <= 75:
        return line

    parts: list[str] = []
    current = b""
    limit = 75
    for char in line:
        chunk = char.encode("utf-8")
        if len(current) + len(chunk) > limit:
            parts.append(current.decode("utf-8"))
            current = chunk
            limit = 74  # continuation lines start with a space
        else:
            current += chunk
    if current:
        parts.append(current.decode("utf-8"))
    return (CRLF + " ").join(parts)


def _stamp(moment: datetime | None = None) -> str:
    value = moment or datetime.now(timezone.utc)
    return value.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _compact(value: date) -> str:
    return value.strftime("%Y%m%d")


def slugify(value: str, fallback: str = "application") -> str:
    """Filesystem-safe fragment for the download filename."""
    cleaned = []
    for char in value.lower():
        if char.isalnum():
            cleaned.append(char)
        elif cleaned and cleaned[-1] != "-":
            cleaned.append("-")
    slug = "".join(cleaned).strip("-")
    return (slug or fallback)[:48]


def build_deadline_ics(
    *,
    application_id: int,
    session_id: str,
    title: str,
    company: str,
    deadline: date,
    url: str = "",
    status: str = "",
    now: datetime | None = None,
) -> str:
    """Build a single all-day VEVENT with 3-day and 1-day alarms."""
    stamp = _stamp(now)
    uid = f"placemark-{session_id}-{application_id}@placemark"

    description_lines = [f"Application deadline for {title} at {company}."]
    if status:
        description_lines.append(f"Current status: {status}.")
    if url:
        description_lines.append(f"Listing: {url}")
    description = _escape_text("\n".join(description_lines))

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{PRODID}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{stamp}",
        f"DTSTART;VALUE=DATE:{_compact(deadline)}",
        # An all-day event's DTEND is exclusive, so it is the following day.
        f"DTEND;VALUE=DATE:{_compact(date.fromordinal(deadline.toordinal() + 1))}",
        f"SUMMARY:{_escape_text(f'Application deadline: {title} at {company}')}",
        f"DESCRIPTION:{description}",
        "TRANSP:TRANSPARENT",
    ]

    if url:
        lines.append(f"URL:{_escape_text(url)}")

    for days in ALARM_DAYS_BEFORE:
        label = "3 days" if days == 3 else "1 day"
        lines.extend(
            [
                "BEGIN:VALARM",
                "ACTION:DISPLAY",
                f"TRIGGER:-P{days}D",
                f"DESCRIPTION:{_escape_text(f'Deadline in {label}: {title} at {company}')}",
                "END:VALARM",
            ]
        )

    lines.extend(["END:VEVENT", "END:VCALENDAR"])

    return CRLF.join(_fold(line) for line in lines) + CRLF
