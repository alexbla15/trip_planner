Status: done
Track: B

## Completion Summary
Confirmed by user 2026-09-30.

## Request
Follow-up on the production report of "can't see the buttons": user
confirmed it's the alert filter chips specifically, and wants them to always
show (even for just one alert type) rather than only when 2+ types exist.

## Context
This trip's report was likely just the pre-existing single-type gate: the
filter row previously only rendered when `presentAlertTypes.length > 1`, so
a trip with just one kind of issue (e.g. only overlaps) correctly showed no
chips at all — not a bug, but the user wants it changed.

## Fix
`src/app/trips/[id]/CalendarSection.tsx`: relaxed the filter-row gate from
`presentAlertTypes.length > 1` to `presentAlertTypes.length > 0` — the row
now shows whenever there's at least one alert, even a single chip.

## Implementation Notes
- `tsc --noEmit`: clean (one-character gate change).
- Verified live: a trip with only a time-overlap alert now shows a single
  "Overlap (1)" chip, and toggling it correctly hides that alert.
