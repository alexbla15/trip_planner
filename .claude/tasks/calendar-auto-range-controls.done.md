# Task: Auto-derive calendar day-range instead of manual controls

Status: done
Track: B
Track reason: removes an existing control and changes derivation logic; no new visual surface

## Problem
`CalendarSection.tsx` lets the user manually pick the visible day range via two `<select>` dropdowns ("From"/"To", the `.rangeControls` block, lines ~900-918), which persist to `trip.calDayStart`/`calDayEnd`. The auto-fit-from-schedule logic (`computeScheduleHourBounds`) currently only runs once on first mount as a fallback when no DB value exists yet — it explicitly does NOT re-run when the schedule changes afterward (per the code comment at lines 102-107), and the user can override it manually via the selects. The requirement is for this range to never be user-editable and to always track the current schedule.

## Goal
The calendar's visible hour range is always automatically derived from the current schedule — min = start hour of the earliest scheduled attraction that day, max = end hour of the latest — with no manual override, and the view refreshes immediately whenever the schedule changes (attraction added/moved/removed/time-edited).

## Requirements
- Remove the `.rangeControls` "From"/"To" `<select>` UI entirely from the `Header` sub-component.
- Remove `onDayStartChange`/`onDayEndChange`/`saveCalRange` and the `calDayStart`/`calDayEnd` persistence to the trip document (or keep persistence only as a derived cache if needed for other consumers — confirm during implementation whether anything else reads `trip.calDayStart`/`calDayEnd`).
- `dayStart`/`dayEnd` become fully derived state: recompute via `computeScheduleHourBounds(attractions)` on every relevant change to the day's scheduled attractions (add, remove, retime, duplicate), not just on mount.
- When a day has no scheduled attractions, fall back to `DEFAULT_DAY_START`/`DEFAULT_DAY_END` (`src/config/ui.ts`).
- The calendar grid re-renders to reflect the new bounds immediately after any schedule-changing action — no stale view requiring manual refresh.

## Constraints
- Keep `computeScheduleHourBounds` (`CalendarSection.utils.ts`) as the single source of the min/max calculation; don't duplicate this logic elsewhere.
- This task only concerns the visible range of the calendar UI, not the default time assigned to newly-placed attractions — that's [[attraction-assign-append-to-day]].

## Out of scope
- Per-user preference for calendar range (explicitly being removed, not preserved as a setting).

## Implementation Notes
- Files created/modified:
  - `src/app/trips/[id]/CalendarSection.tsx` — removed the `dayStart`/`dayEnd` `useState` pair, `saveCalRange`/`handleDayStartChange`/`handleDayEndChange`, the `.rangeControls` JSX block, `ALL_HOURS`, and the now-unused `updateTrip` import. Replaced with `const scheduleBounds = useMemo(() => computeScheduleHourBounds(local), [local])` and `dayStart`/`dayEnd` derived directly from it (falling back to `DEFAULT_DAY_START`/`DEFAULT_DAY_END`) — recomputes automatically on every render where `local` (the live schedule state) changes, so no explicit refresh wiring was needed.
  - `Header` sub-component + `HeaderProps` — dropped `dayStart`/`dayEnd`/`onDayStartChange`/`onDayEndChange`.
  - `src/app/trips/[id]/CalendarSection.module.css` — removed `.rangeControls`/`.rangeLabel`/`.rangeSelect` (base + mobile media query).
  - `calDayStart`/`calDayEnd` removed entirely (not just from the UI) since nothing else read them: `src/models/Trip.ts` (interface, schema, `formatTrip`), `src/types/trip.ts`, `src/lib/services/trips.service.ts` (`UpdateTripInput` + handling), `swagger.yaml` (both `Trip` and `UpdateTripInput`-equivalent schemas).
- Deviations from task requirements: none. Confirmed via grep that no other file read `calDayStart`/`calDayEnd`, so removed the persisted field entirely rather than keeping it as an unused derived cache.
- New design tokens used: none (pure removal + logic change).
- Verified live: restarted the dev server (schema change — same stale-Mongoose-model consideration as the earlier opening-hours task), then loaded the real "Berlin 2024" trip via a real browser — the "From"/"To" selects are gone, and the calendar auto-fits to the schedule (06:00–22:00, spanning the earliest flight to the latest evening item) with the Dec 26 overlap layout still correct.

## Completion Summary
The calendar's visible hour range is now fully auto-derived from the current schedule with no manual override — the "From"/"To" selects were removed along with their DB persistence (`calDayStart`/`calDayEnd`, removed end-to-end since nothing else read them), and the range recomputes live off the schedule state so it always reflects the earliest start to latest end without needing a manual refresh. Confirmed by the user and closed 2026-08-20.
