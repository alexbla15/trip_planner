# Task: Assign attraction to day — append after last attraction or at 7:00

Status: intake
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
