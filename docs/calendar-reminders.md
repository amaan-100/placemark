# Calendar export and deadline reminders

Branch: `feat/calendar-reminders` (stacked on `main` @ `9de35bd`)
Date: 2026-11-11

This closes the last uncovered must-have: **real tool calls for calendar or
reminders**. Deadlines already existed as data; nothing consumed them. Now a
deadline can be exported as a standards-compliant calendar event with two
alarms, and due dates surface as an in-app reminder.

No migration. Everything derives from the existing `applications.deadline`
column.

---

## 1. The tool call: ICS export

`GET /api/applications/{id}/deadline.ics`

Returns a single all-day `VEVENT` with **two alarms, 3 days and 1 day before**
the deadline. Implemented by hand in `backend/app/services/calendar.py` — the
surface is one event with two alarms, so a dependency would add more code than
it removes.

### Choices that matter

| Decision | Reason |
| --- | --- |
| `DTSTART;VALUE=DATE` (all-day) | `deadline` is a date-only string. A timed event would require inventing an hour and a timezone the student never gave, and would shift across zones. |
| `DTEND` is the following day | An all-day event's end is exclusive per RFC 5545. |
| CRLF line endings | Required by the spec; a bare `\n` makes some clients reject the file outright. |
| Stable `UID` | Re-importing updates the existing event instead of creating duplicates. |
| Text escaping | Backslash, semicolon, comma, and newlines are escaped, so a company named `Acme, Inc.` does not corrupt the file. |
| Filename slug | Company names contain `/` and `.`; the filename is reduced to `[a-z0-9-]`. |

Verified output:

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Placemark//Application deadline//EN
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261114
BEGIN:VALARM
TRIGGER:-P3D
END:VALARM
BEGIN:VALARM
TRIGGER:-P1D
END:VALARM
END:VEVENT
END:VCALENDAR
```

Response headers:

```
content-type: text/calendar; charset=utf-8
content-disposition: attachment; filename="placemark-canonical-2026-11-14.ics"
```

Errors: `404` if the application belongs to another session, `400
deadline_missing` if no deadline is set.

Every export records an agent run (`agent="calendar"`, `action="export_ics"`),
so it appears in the trace rail like any other tool call.

### CORS

`main.py` now exposes `Content-Disposition`. Without it the browser cannot read
the filename cross-origin (Vercel → Render), and the download would arrive with
a generic name.

---

## 2. Reminders

`GET /api/reminders` returns the session's dated applications:

```json
{ "items": [{ "application_id": 18, "title": "Software Developer",
              "company": "Canonical", "deadline": "2026-11-14",
              "days_left": 3, "kind": "soon" }],
  "overdue": 0, "due_soon": 1, "total": 1 }
```

`backend/app/services/reminders.py` does the bucketing:

| `days_left` | `kind` |
| --- | --- |
| `< 0` | `overdue` |
| `0` | `today` |
| `1…7` | `soon` |
| `> 7` | `later` |

**Date-only arithmetic**, never timestamps. The stored value is `YYYY-MM-DD`, so
comparing plain dates removes any server/client timezone drift by construction.
This matters: computing on datetimes gives a deadline that flips buckets
depending on where the server sits.

Undated applications are excluded — there is nothing to remind about. Items are
sorted soonest-first.

Cost: zero. No cron, no email, no external service.

---

## 3. Reminder banner

`frontend/src/components/ReminderBanner.tsx`, rendered above the workspace grid
in the same slot as the wake notice.

> **2 overdue · 3 due within 7 days** — add the next one to your calendar.
> `Review deadlines` · `Dismiss for today` · `Don't show again` · `×`

`Review deadlines` jumps to Step 03. Overdue states use the error tone.

### Dismissal model

Two localStorage keys, no server storage:

| Key | Meaning |
| --- | --- |
| `pc_reminders_snoozed_until` | Epoch ms of the **next local midnight**. Hides until then. |
| `pc_reminders_seen_state` | `"<overdueCount>:<sorted urgent app ids>"`. Hides this exact situation. |

The state key is what makes dismissal behave sensibly: **the banner reappears
when the situation changes** — a new overdue application, or a deadline entering
the 7-day window. "Don't show again" therefore means *"stop telling me about
this state"*, not *"never warn me about deadlines again"*. That mirrors how
Vercel and Linear keep such banners useful instead of permanently dead.

Deliberately **not** a modal on dismiss: interrupting someone to ask about the
thing they just dismissed is the pattern most large products avoid (Gmail, GitHub
and Stripe all dismiss inline; Gmail offers an Undo toast instead).

Why localStorage rather than the database: it is a display preference, not user
data. It costs no row, no migration, and no endpoint — and per-device is arguably
more correct, since a student may want reminders on their laptop but not their
phone.

Nothing is lost by dismissing: the sidebar **Deadlines ≤ 7d** count and the Step
03 chips stay visible regardless.

---

## 4. Frontend wiring

- `api/client.ts` — `getReminders()`, and `downloadDeadlineIcs()`.
  The download helper is **separate from `request()`** on purpose: that helper
  parses every body as JSON and treats an unparseable payload as "server waking",
  which would break a `text/calendar` response.
- `steps/StepApprove.tsx` — "Calendar" action on each queue row that has a
  deadline. Rows without one do not show it.
- `Workspace.tsx` — reminders fetched at mount and refreshed after any deadline
  edit, plus a dismissible error strip if an export fails.
- `lib/agents.ts` — `calendar` agent (`Calendar Agent` / `CAL`), otherwise its
  traces fall back to "Session".
- `utils.ts` — trace summary for `export_ics`.

The ApprovalDialog deliberately has **no** calendar button: its date field is
local, unsaved state, so exporting from there could produce a file that disagrees
with what is stored.

---

## 5. Verification

| Check | Result |
| --- | --- |
| `pytest` | **80 passed** (57 before + 23 new) |
| `npm run build` / `typecheck` | clean |
| Live ICS response | `200`, `text/calendar`, correct filename |
| ICS structure | CRLF confirmed, 2 × `VALARM`, `-P3D` and `-P1D`, `DTSTART;VALUE=DATE` |
| Live reminders | `days_left: 3`, `kind: soon` |
| 400 without deadline | verified |
| 404 cross-session | verified |
| Trace | `agent=calendar, action=export_ics, alarm_days=[3,1]` |
| Browser download | fires, `.ics` filename, valid iCalendar body |
| Dismiss | hides banner, key set to next local midnight |
| Snooze across reload | persists |
| Mobile 390px | no horizontal overflow |

Test bugs found and fixed during verification (test assumptions, not product
bugs): mock listings ship their own deadlines, so drafts inherit one — the
"no deadline" cases must clear it explicitly. And the trace drawer is a modal,
so it must be closed before interacting with the banner.

---

## 6. Files

**Backend:** `app/services/calendar.py` (new), `app/services/reminders.py` (new),
`app/routers/calendar.py` (new), `app/main.py` (router + CORS expose header),
`app/schemas.py` (`ReminderOut`, `ReminderListResponse`),
`tests/test_calendar.py` (new), `tests/test_calendar_api.py` (new)

**Frontend:** `api/client.ts`, `api/types.ts`, `components/ReminderBanner.tsx`
(new), `components/Workspace.tsx`, `components/steps/StepApprove.tsx`,
`lib/agents.ts`, `utils.ts`

---

## 7. Not done

- **Email reminders.** Skipped deliberately: Neon Auth's shared mailer is for
  auth messages only, and real reminder mail needs SMTP credentials. The ICS
  alarms are delivered by the student's own calendar app, which is better anyway
  — it works offline and respects their notification settings.
- **Server-side dismissal storage.** Would need a table and an endpoint for no
  real gain; see the rationale above.
- Verification used port 8001 because port 8000 was held by an orphaned socket
  on this machine. Applies to local runs only.
