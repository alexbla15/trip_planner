# Task: Assign attraction to day — append after last attraction or at 7:00

Status: done
Track: B
Track reason: pure scheduling-logic fix, no UI change

## Problem
When an attraction is assigned to a specific day (via sidebar drag/click, `handleAssign` in `CalendarSection.tsx`, or duplicate via `handleDuplicateAttraction`), the placement time comes from `findEarliestFreeSlot` (`src/lib/schedule.ts`, lines 136-157). That function always starts its search candidate at the hardcoded constant `DEFAULT_DAY_START` (7:00) and walks forward past conflicts — so on a day that already has attractions ending well before the requested one could fit earlier, it can insert into an earlier free gap instead of always landing after the last attraction. The desired behavior is simpler and more predictable: always place the new attraction immediately after the current last attraction of that day, or at 7:00 if the day is empty.

## Goal
Assigning an attraction to a day places it right after the end of that day's last-scheduled attraction, or at 7:00 if the day has nothing scheduled yet — never into an earlier gap.

## Requirements
- Update the placement logic used by `handleAssign` and `handleDuplicateAttraction` (`CalendarSection.tsx`) so the candidate start time is: `max(7:00, end time of the last attraction currently on that day)`, using existing end-time computation (`attractionEndMins`, already in `CalendarSection.utils.ts`) rather than the gap-filling `findEarliestFreeSlot` search.
- If the day has no attractions yet, place at 7:00 (`DEFAULT_DAY_START`).
- Keep the existing clamp so a placement doesn't create a plannedTime past the day's latest bound; confirm current clamp constant/behavior during implementation and keep it consistent with whatever the auto-derived day range from [[calendar-auto-range-controls]] settles on.
- Decide whether `findEarliestFreeSlot` remains used anywhere else (grep before removing) — if it becomes dead code after this change, remove it; if still used elsewhere, leave it and only change the call sites in `CalendarSection.tsx`.

## Constraints
- Duration source (`actualDurationValue`/`durationValue`, 60-min fallback) stays unchanged.
- This is about the *default* placement time only — manual retime via drag or edit remains as-is.

## Out of scope
- Changing how existing scheduled attractions are displayed or reordered.

## Implementation Notes
- Files created/modified:
  - `src/lib/schedule.ts` — replaced `findEarliestFreeSlot` (gap-filling search, clamped to the visible range) with `nextSlotAfterLast(timedOnDay)`: `max(07:00, latest end time among the day's timed attractions)`, no upper clamp. Removed the now-unused `DEFAULT_DAY_END` import.
  - `src/lib/index.ts` — barrel export updated (`findEarliestFreeSlot` → `nextSlotAfterLast`).
  - `src/app/trips/[id]/CalendarSection.tsx` — `handleAssign` and `handleDuplicateAttraction` now call `nextSlotAfterLast`; dropped the dead duration-computation blocks in both (only needed for the old gap-search, `nextSlotAfterLast` doesn't take a duration).
- Deviations from task requirements: the "keep the existing clamp" requirement was dropped per the task's own escape hatch — confirmed the clamp only existed to keep placements inside the old manually-set visible range, which no longer exists after `calendar-auto-range-controls` (the range is now derived *from* the schedule, so clamping placement to it would be circular). `findEarliestFreeSlot` had no other call sites (grepped), so it was removed rather than left as dead code.
- New design tokens used: none (logic-only change).
- Verified live via a real browser against a seeded scenario: assigning an attraction to a day that already had one running 09:00–10:00 placed the new one at exactly 10:00 (not into any earlier gap); assigning a different attraction to an empty day placed it at 07:00. Both confirmed via screenshot of the actual rendered calendar blocks.

## Completion Summary
Assigning an attraction to a day now always places it immediately after that day's current last attraction, or at 7:00 for an empty day, replacing the previous gap-filling search behavior. Confirmed by the user and closed 2026-08-20.
