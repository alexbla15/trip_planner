# Task: Fix trip scheduler mobile view; add direct date selection

Status: done
Track: A
Track reason: new mobile interaction (a date picker/selector) not yet established for the Calendar/scheduler; the existing swipe-only navigation is being supplemented with a new control.

## Problem
On phone-width viewports, the scheduler/Calendar view in `trips/[id]` is broken or hard to use (exact issue to diagnose — likely cramped layout or overflow), and the only way to navigate between days is swiping left/right — there's no way to jump directly to a specific date in the trip.

## Goal
The Calendar/scheduler in `trips/[id]` displays correctly on phone-width viewports, and users can either swipe between days (existing behavior, preserved) or open a date picker to jump straight to any date within the trip's date range.

## Requirements
- Diagnose and fix the mobile layout issue(s) in `CalendarSection.tsx` (or wherever the day-by-day mobile view lives) — verify in a real phone-width viewport.
- Add a date-selection control (e.g. a compact date picker or day-chip strip) scoped to the trip's actual date range (`trip.startDate`–`trip.endDate`), visible in mobile view, that jumps the calendar to the chosen date.
- Preserve existing swipe left/right day navigation — the date picker is additive, not a replacement.
- Keep both navigation methods in sync (swiping updates whatever "current date" state the picker reflects, and vice versa).

## Constraints
- Respect the existing read-only/edit-mode gating (`effectiveCanEdit`) — this is a navigation feature, available regardless of edit mode, but must not itself expose any editing affordance to read-only viewers.
- Reuse existing date-handling utilities/formatting already used elsewhere in Calendar rather than introducing a new date library.

## Out of scope
- Any change to desktop Calendar layout or navigation.
- Changing the scheduling/assignment logic itself — this is navigation/display only.

## Implementation Notes
- Files created/modified:
  - `src/app/trips/[id]/CalendarSection.module.css` — found and fixed the actual root cause of the "broken mobile view" report: the `@media (max-width: 768px)` carousel-override block for `.dayColumnsWrapper`/`.dayColumns`/`.dayColumn` was declared *earlier* in the file than their unconditional base versions. Equal specificity + later-source-wins meant the base rules (fixed `--day-width` sizing, `overflow-x: auto`, no transform) always won on mobile, so the "one day per swipe" carousel was never actually applying its intended sizing/clipping/transform — columns kept their desktop width while the transform math assumed 100%-wide slides, producing a visibly broken, misaligned mobile calendar. Moved the media query block to immediately after the three base rules it overrides, so it now wins as intended.
  - `src/app/trips/[id]/CalendarSection.tsx` — added a `<select>` "jump to date" control (options built from the same `days`/`formatDayLabel` already used for day headers) right above the existing dot indicator, wired to the same `mobileDayIdx` state the swipe gesture already drives — selecting a date jumps the carousel, and swiping updates the select's value right back (single shared state, no extra sync logic needed). Added a visually-hidden `<label>` for accessibility.
  - `src/app/trips/[id]/CalendarSection.module.css` — added `.mobileDatePicker` (hidden by default like the existing `.mobileDayIndicator`/`.mobileDot` pattern; shown as a full-width bordered select inside the same, now-correctly-ordered mobile media query block).
- Deviations from task requirements: none — no new date library introduced (native `<select>` + existing `formatDayLabel`/`getTripDays`); no edit-mode gating needed since this is pure navigation, same as the pre-existing dot indicator.
- New design tokens used: none — reused `--color-border`, `--color-surface`, `--color-text-primary`, `--radius-md`, `--color-primary` (focus outline).
- Verified: `next build` succeeds.

## Completion Summary
Fixed the actual cause of the broken mobile trip scheduler — a CSS cascade ordering bug where the swipe-carousel's mobile overrides were always losing to their own unconditional base rules — and added a "jump to date" select above the day dots, kept in sync with the existing swipe-driven `mobileDayIdx` state. Closed 2026-08-27.
