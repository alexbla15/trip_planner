# Task: Fix Map Path When Two Residences Fall on the Same Day (Check-out + Check-in)

Status: intake

Track: B
Track reason: Bug fix to existing map route/path logic — no new UI surface, just correcting which point is treated as the day's start/end.

## Problem
On a trip's Overview/day map (`src/app/trips/[id]/TripDayMapWidget.tsx` or similar — verify exact file), when a single day has two residences scheduled (e.g. checking out of one place and checking into another on the same day), the day's route path doesn't correctly account for which residence is the check-out (should anchor the start of the day's path) and which is the check-in (should anchor the end). This likely produces a visually wrong or reversed route for that day.

## Goal
When a day includes both a check-out and a check-in residence, the map path correctly starts at the check-out location and ends at the check-in location (or vice versa, whichever is the actually correct chronological direction), instead of using an arbitrary or incorrect ordering.

## Requirements
- Locate the day-path/route-ordering logic for the trip map (likely in `src/app/trips/[id]/TripDayMapWidget.tsx`, `CalendarSection.utils.ts`, or a map-routing helper in `src/lib/`)
- When a day's scheduled items include two residences, check each one's role for that specific day: a residence can be a check-out (the day matches its `checkOutDate`) or a check-in (the day matches its `checkInDate`) — a residence spanning multiple days could even be neither on a given day if it's just a "staying there" day with no map anchor needed
- Order the day's path so the check-out residence is treated as the starting point and the check-in residence as the ending point (confirm the correct chronological convention by reading how residence check-in/check-out dates are used elsewhere, e.g. `src/models/Trip.ts`'s schedule entries, before assuming a direction)
- Verify against a real trip with this exact scenario (two residences, one check-out + one check-in, same day) rather than only reasoning about it from the code

## Constraints
- Don't change how single-residence days or non-residence attraction days compute their path — only the two-residence-same-day case is in scope
- Reuse existing residence check-in/check-out date fields already on the schedule entry (per `docs/LEARNINGS.md`'s residence schedule-entry-override pattern) — don't add new fields unless the investigation shows the needed data isn't already there

## Out of scope
- Redesigning the map/path visualization itself
- Handling more than two residences overlapping on the same day (not a reported scenario)
