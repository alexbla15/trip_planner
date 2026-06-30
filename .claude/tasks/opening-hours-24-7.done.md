# Task: Add "Open 24/7" Option to Attraction Opening Hours

Status: done

Track: B
Track reason: logic + small UI addition to existing OpeningHoursGrid form component; no new layout or pattern

## Problem
When adding or editing an attraction, the opening hours grid requires filling in daily open/close times. There is no way to mark an attraction as "open 24/7" (e.g. airports, 24-hour convenience stores, landmarks with no closing time), forcing users to manually set 00:00–23:59 for every day.

## Goal
A single "Open 24/7" checkbox/toggle in the opening hours section that instantly sets all days to open all day, saving the user from manual entry.

## Requirements
- Add an "Open 24/7" checkbox above or below the `OpeningHoursGrid` in the `NewAttractionModal`
- When checked: set every day in `openingHours` to `{ closed: false, open: "00:00", close: "23:59" }`
- When unchecked: restore previous values (or reset to `DEFAULT_OPENING_HOURS`)
- The grid remains editable even when 24/7 is checked — checking 24/7 is a shortcut, not a lock
- If the user manually edits any time after checking 24/7, the 24/7 checkbox should uncheck (to reflect that it's no longer exactly 24/7)

## Location
- `src/components/NewAttractionModal/NewAttractionModal.tsx` — where `openingHours` state is managed and `OpeningHoursGrid` is rendered
- The checkbox lives in the `NewAttractionModal`, not inside `OpeningHoursGrid`

## Constraints
- CSS Modules only
- Use existing design tokens for the checkbox/label styling (match the surrounding form style)
- The `openingHours` data shape does not change — `{ closed: boolean; open: string; close: string }` per day

## Out of scope
- Persisting the "24/7" flag separately — only the resulting `openingHours` values matter
- Changing `OpeningHoursGrid` internals


## Implementation Notes
- Files modified: `src/components/NewAttractionModal/NewAttractionModal.tsx`, `src/components/NewAttractionModal/NewAttractionModal.module.css`
- Deviations from brief: reset of is24h added inside the existing isOpen sync useEffect rather than a separate useEffect([initialData]) — equivalent behaviour since the sync runs every time the modal opens with new initialData
- New design tokens used: none


## Completion Summary
Added an 'Open 24/7' toggle chip inline with the Opening Hours label in the NewAttractionModal. When active, the opening hours grid is hidden and all days are set to 00:00-23:59. Manual edits to any day automatically deactivate the toggle. Confirmed by user 2026-06-29.
