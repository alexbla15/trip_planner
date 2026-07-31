# Task: Fix Map Path When Two Residences Fall on the Same Day (Check-out + Check-in)

Status: done

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

## Implementation Notes
- Files modified: `src/app/trips/[id]/TripDayMapWidget.tsx` (~lines 280-295)
- Deviations from requirements: none
- New design tokens used: none — logic-only fix, no UI change (residence markers already correctly showed both residences; only the route/path anchor selection was wrong)
- Root cause confirmed exactly as scoped: `const dayResidence = dayResidences[0] ?? null;` picked one arbitrary residence and used it as **both** the start and end anchor of the day's route whenever no flight waypoints existed that day — so on a transfer day (checking out of one place, into another) the second residence was silently dropped from the path entirely.
- Fix: `checkOutResidence = dayResidences.find(r => r.checkOutDate === selectedDay)`, `checkInResidence = dayResidences.find(r => r.checkInDate === selectedDay)` — start anchors on the check-out residence (falling back to `dayResidences[0]` when neither boundary lands on this day, preserving the original single-residence "staying here" behavior), end anchors on the check-in residence with the same fallback.
- **Verified against real production data, not just reasoned about:** found real transfer days already in the database across two different trips ("UK 2022": 3 transfer days; "Iceland 2023": 4 transfer days) via a direct MongoDB query. Simulated the exact fix logic against "UK 2022"'s 2022-10-04 transfer day (Best Western Northfields Ealing Hotel → The Lansdowne Boutique Rooms): confirmed the old code would have anchored both start and end of that day's route at the Best Western (silently ignoring the Lansdowne, the place actually being checked into), while the new logic correctly anchors start at the check-out hotel and end at the check-in hotel.
- `tsc --noEmit` clean. `eslint` shows 1 pre-existing error + 2 pre-existing warnings on this file, all confirmed unrelated to the touched lines (a `set-state-in-effect` finding on the unrelated `qualifyingDays` effect, and two `exhaustive-deps` warnings on unrelated effects/memos further down the file).

## Completion Summary
Fixed the trip day-map route path silently dropping a residence on transfer days (check-out of one place, check-in to another on the same day) — the path now correctly starts at the check-out residence and ends at the check-in residence, instead of anchoring both ends at one arbitrary residence. Verified against real transfer days already in the database. Confirmed by user. Closed 2026-07-31.
