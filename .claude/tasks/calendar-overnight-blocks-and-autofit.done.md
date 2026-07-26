# Task: Overnight calendar cards span both days; auto-fit initial day window to schedule

Status: done
Track: B
Track reason: Calendar layout/logic changes using the existing block-positioning system (`slotTop`/`cardPx`/`layoutTimed`) — no new visual pattern, no new component.

## Problem
1. A scheduled item (flight, custom time-slot, or any attraction) whose duration crosses midnight only ever rendered on its start day — the portion of its duration past midnight was invisible, with no indication on the following day that anything was still happening.
2. The calendar's initial visible day window (`calDayStart`/`calDayEnd`) always fell back to a fixed default (`DEFAULT_DAY_START`/`DEFAULT_DAY_END`) for any trip that hadn't explicitly customized it, regardless of what was actually scheduled — a trip with everything scheduled 09:00–17:00 got the same generic window as a trip with a 06:00 flight.

## Goal
1. When a card's duration spills past midnight, a "continuation" block appears on the next day too (from 00:00 until the spillover end time), visually distinguished from a normal block.
2. A trip's initial day window (when `calDayStart`/`calDayEnd` haven't been explicitly set/saved yet) is computed from the actual schedule — earliest start hour (floored) to latest end hour (ceiled) — falling back to the fixed defaults only when nothing is scheduled.

## Requirements
- `src/app/trips/[id]/CalendarSection.tsx`: for each rendered day, compute `spillovers` — items scheduled on the *previous* day whose `attractionEndMins` exceeds 1440 (i.e., end past midnight) — and build display-only "continuation clones" (`plannedTime: "00:00"`, duration = spillover minutes) included in that day's `layoutTimed` call so they participate in overlap-column layout.
- Continuation blocks are visually distinct (`.blockContinuation` — no top border/radius, reduced opacity) and show `↷ until HH:MM` instead of a start time.
- Clicking a continuation block always resolves back to the real (previous-day) attraction object via `spilloverOriginalsById`, and is always view-only (never opens the edit popup/custom-slot editor) — editing must happen from the day the item actually starts on.
- Empty-day state ("No attractions") now also checks `continuationItems.length === 0`, so a day with only a continuation isn't mislabeled empty.
- `computeScheduleHourBounds(attractions)` (new, `CalendarSection.utils.ts`) returns `{ start, end }` (floor/ceil, clamped 0–24) from the earliest start / latest end across all timed attractions, or `null` if nothing is scheduled. Used only in the `dayStart`/`dayEnd` `useState` lazy initializers — `trip.calDayStart`/`calDayEnd` (once saved) always take precedence, and the computed bounds never retroactively resize a window on later re-renders.

## Out of scope
- `calcDaySpanMinutes`/`isOverloaded` (the "Xh" workload figure per day) still only counts items whose `plannedDate` falls on that exact day — the spillover portion isn't added to the next day's workload total. Not required by this request; can be a follow-up if wanted.
- The existing overflow alert ("X runs until HH:MM, past the visible day end") still reports raw end time (can show e.g. "26:00") rather than being continuation-aware — pre-existing behavior, unrelated to this task.

## Implementation Notes
- Files modified:
  - `src/app/trips/[id]/CalendarSection.tsx` — added spillover/continuation computation per day; `handleBlockClick` now resolves `clickTarget` (real object for continuations); block JSX shows `↷ until HH:MM` and `.blockContinuation` styling; day-window `useState` initializers now call `computeScheduleHourBounds`.
  - `src/app/trips/[id]/CalendarSection.utils.ts` — added `computeScheduleHourBounds`.
  - `src/app/trips/[id]/CalendarSection.module.css` — added `.blockContinuation`.
- Deviations: none.
- New design tokens: none — reused existing `--radius-sm`/opacity conventions already in the file.
- Verified live: patched a flight to 23:00 + 180min (crossing midnight) with the trip's day window temporarily widened to 0–24 to make both ends visible — confirmed via screenshot that a `↷ until 02:00` continuation block renders correctly on the following day, styled distinctly, before reverting both the flight and the trip's day window back to their original values. `npx tsc --noEmit` clean throughout.

## Completion Summary
Overnight schedule items now show a continuation block on the day their duration spills into; a trip's initial calendar window auto-fits to its actual schedule instead of a fixed default. Verified live against the real running app and DB, then reverted all test data. Closed 2026-07-26.
