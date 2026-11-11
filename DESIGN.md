---
name: Placement Co-pilot
description: A warm, editorial placement desk that turns a resume into a guided, approval-gated route.
colors:
  paper: "#F6F1E7"
  paper-quiet: "#EFE8D8"
  card: "#FCFAF4"
  ink: "#16130E"
  ink-soft: "#57503F"
  line: "#D8CFBA"
  line-strong: "#B9AE94"
  accent: "#E8490F"
  accent-ink: "#C23B0A"
  accent-pressed: "#A63308"
  moss: "#2F5D3A"
  moss-wash: "#E4EBDD"
  amber: "#7A5208"
  amber-wash: "#F3E8C8"
  error: "#B3261E"
  error-wash: "#F6DDD9"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "48px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.15
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.08em"
    textTransform: "uppercase"
rounded:
  panel: "6px"
  control: "3px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent-ink}"
    textColor: "#FFFFFF"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  chip:
    backgroundColor: "{colors.paper-quiet}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
---

# Design System: Placement Co-pilot

## Status

This document describes the system that is **shipped** in `frontend/src`. It replaced an earlier cobalt "Placement Desk" exploration. Artifacts under `.impeccable/` (surface notes and review goldens, dated 2026-10-28) capture that retired direction and are historical, not the current contract. Treat the tokens in `frontend/src/index.css` and this file as the source of truth.

## Overview

**Creative North Star: "The Ledger."**

Placement Co-pilot reads like a well-kept placement ledger: warm paper, ink, ruled lines, and one vermilion stamp for the action that matters. The interface should feel authored and accountable, not like a generic AI dashboard.

The landing page is an editorial front matter: a serif promise, a bordered example dossier, then the route and guardrails. The workspace is a two-plane desk — a numbered route rail and the working document — with the live agent trace available on demand from the header. The route is sequential; approval is explicit; nothing is submitted automatically.

**Key characteristics**
- Warm paper field with a fine grain and ruled-line accents.
- Fraunces for display, Inter for working text, IBM Plex Mono for data labels.
- Vermilion (`#E8490F`) as a decorative accent; a darker ink (`#C23B0A`) for text and primary fills so contrast passes.
- Flat rows and hairline rules instead of nested cards.
- A visible approval gate and a visible agent trace.

## Colors

### Paper and ink
- **Paper** `#F6F1E7`: the page field.
- **Paper quiet** `#EFE8D8`: banners, inset rows, quiet buttons.
- **Card** `#FCFAF4`: task surfaces, dialog shell, inputs that sit on paper.
- **Ink** `#16130E`: primary text and strong rules.
- **Ink soft** `#57503F`: supporting copy, labels, metadata.
- **Line** `#D8CFBA` / **Line strong** `#B9AE94`: hairline dividers and control borders.

### Accent
- **Vermilion** `#E8490F`: large display italics, active markers, meter fills, focus outlines. Decorative and large text only (3.47:1 on paper — passes 3:1 for large text and non-text UI).
- **Vermilion ink** `#C23B0A`: small text, links, primary button fills, active step numbers. 4.76:1 on paper, 5.13:1 on card, 5.35:1 for white text on it.
- **Vermilion pressed** `#A63308`: hover/pressed state for primary actions.

### States
- **Moss** `#2F5D3A` on **moss wash** `#E4EBDD`: grounded, approved, complete, AI-assisted.
- **Amber** `#7A5208` on **amber wash** `#F3E8C8`: pending, cached, fallback. 5.64:1 on its wash, 6.13:1 on paper.
- **Error** `#B3261E` on **error wash** `#F6DDD9`: failures and destructive actions.

### Rules
**The One Stamp Rule.** Vermilion marks the current action, active route marker, and score meter. It is not a wash and not a second neutral.
**The Ink Rule.** Any vermilion text below 24px uses `#C23B0A`, never `#E8490F`.
**The Confirmed Rule.** Moss means confirmed or complete, never a score grade.

## Typography

**Display:** Fraunces (Georgia fallback). **Body:** Inter (system fallback). **Data:** IBM Plex Mono.

- **Display:** 48–72px, 600, tight tracking, used for the landing promise and step titles.
- **Headline:** 24–32px Fraunces 600 for panel and dialog headings.
- **Body:** 15px / 1.6 Inter for task copy; 13px for supporting rows.
- **Mono label:** 10–11px uppercase, 0.08em tracking, for step numbers, status, counts, IDs, and scores.

**Rules**
- Serif is for authored voice, not for dense UI text.
- Mono is for data and labels only; never set paragraphs in it.
- Do not introduce a fourth family. Fonts load from Google Fonts with `display=swap` and preconnect hints in `index.html`.

## Layout

- **Landing:** max-width `1200px`; editorial header, bordered example dossier, four-step route, guardrail commitments, footer. Rules and borders carry structure.
- **Workspace:** full-width shell; a sticky 64px header; a `xl` two-column grid of `280px / minmax(0,1fr)` (route rail + working document). Below `xl` the rail becomes a horizontal, scrollable step row. The agent trace is never a permanent column — it slides in on demand at every size (see Trace rail).
- **Document column:** padded `16px` → `40px`, max-width none inside the grid; step content uses a two-column split for main work plus a scoring/summary aside where useful.
- **Touch targets:** interactive controls are at least 44×44px; small chips that act as buttons keep a 44px hit area.
- **Spacing rhythm:** 4 / 8 / 16 / 24 / 40. More space above a heading than below it.

## Depth and motion

- Flat paper at rest. Borders (`1px` line, `2px` ink for the header and dialog) carry structure.
- Shadows are reserved for floating layers: the approval dialog and the on-demand trace drawer.
- Primary buttons use a hard `0 2px 0 #16130E` offset; this is the one place a hard shadow is allowed.
- Motion: 0.35–0.45s entrances with `cubic-bezier(0.22, 1, 0.36, 1)`. Step changes fade and lift; score meters animate `transform: scaleX` from `origin-left`.
- `prefers-reduced-motion` removes transforms, meter animation, smooth scrolling, and shimmer. Every animated component also reads `useReducedMotion` so the fallback is instant rather than a 0.01ms flash.

## Shapes

- Panels and dialogs: `6px`. Controls and inputs: `3px`. Status chips: pill.
- Signature geometry: the numbered circular route marker on a 4px rail border, and the rectangular approval stamp.
- No blobs, diagonal cuts, glass panels, or gradient text.

## Components

### Buttons (`ui.tsx` → `Btn`)
- Primary: `#C23B0A` fill, white label, hard 2px ink shadow; hover/pressed `#A63308`.
- Secondary: card fill, strong hairline border, ink label.
- Ghost: transparent with a hairline border; used for queue rows and retry.
- Disabled: 50% opacity, no pointer events; label remains readable.

### Chips
- Paper-quiet fill, ink-soft mono label, pill radius.
- Tones: moss wash for confirmed, amber wash for pending/fallback, error wash for failure.

### Inputs
- Paper fill, strong hairline, 3px radius, visible vermilion focus border and 2px focus outline.
- Labels are real `<label>` elements; errors appear inline near the field or as an alert toast.

### Route rail
- Four numbered steps. Completed steps show a moss check; the current step shows a vermilion-ink marker; upcoming steps are outlined.
- Desktop: vertical rail with a left accent border on the active item and a session summary below.
- Mobile: horizontal scroll row; step names stay visible at every width, agent subtitles appear from `sm`.

### Approval dialog
- Modal with focus trap, Escape to close, body scroll lock, and focus restore.
- Requires an explicit checkbox plus typing `approve`; the primary action records approval only — it never submits to an employer.

### Trace rail
- Chronological agent log with agent name, latency, summary, and AI/fallback/system mode. Each entry's dot is joined to the next by a per-item connector, so the line runs unbroken through the whole list at any scroll position.
- Live region (`role="log"`, polite). Checking and unknown AI states are neutral, not green.
- Hidden by default at every size. A header **Trace** button slides it in as a right-hand drawer (`w-[86%] max-w-sm`, `sm:380px`); it is keyboard-trapped, `inert`s the working shell, closes on Escape, the backdrop, the close button, or dragging the header handle to the right.

### Step practice
- Approval-gated: locked until an application is approved.
- Question chips show done / current / upcoming; the transcript is collapsible; the answer field shows a 20-character minimum and a word count.
- Scoring shows the overall score plus the four rubric dimensions (relevance 30, structure 25, evidence 25, accuracy 20) and weak areas below 60.

## Accessibility contract

- Text contrast is at least 4.5:1; large text and UI boundaries at least 3:1. The palette above is chosen to meet this — do not lighten `accent-ink` or `amber` back toward their decorative values.
- All controls have accessible names; icon-only buttons use `aria-label`.
- A skip link jumps to `#workspace-main`; step changes announce politely and move focus to the step heading.
- Mobile drawer and approval dialog trap focus, close on Escape, lock body scroll, and restore focus.
- Status is never conveyed by color alone: labels accompany every tone.

## Do's and don'ts

**Do**
- Keep the paper field warm and the structure ruled.
- Use vermilion for the current action and one decorative emphasis per view.
- Use `#C23B0A` for small accent text and primary fills.
- Keep rows flat; separate with hairlines.
- Make approval honest and submission manual.

**Don't**
- Don't reintroduce the cobalt "Placement Desk" palette or Instrument Sans.
- Don't use `#E8490F` for small text or as a button fill with white text.
- Don't use moss for scores or neutral tags.
- Don't nest cards inside panels.
- Don't add a fourth typeface, gradient text, or glass effects.
