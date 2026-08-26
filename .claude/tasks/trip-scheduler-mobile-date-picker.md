# Task: Fix trip scheduler mobile view; add direct date selection

Status: intake
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
