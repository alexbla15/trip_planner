# Task: Opening months (seasonal availability) on attractions

Status: intake
Track: A
Track reason: New data model field plus a new form UI (month selector) with no existing equivalent pattern in the design system — needs a design pass before implementation.

## Problem
Attractions currently only model weekly opening hours (`openingHours`, Mon–Sun). Some attractions (seasonal markets, ski resorts, certain parks) are only open certain months of the year. There's no way to record this, and trips scheduled for an attraction outside its actual open season get no warning.

## Goal
An attraction can optionally specify which months of the year it's open (defaulting to all 12 / year-round when not specified), and a trip's schedule view warns when an attraction is scheduled for a date outside its open months.

## Requirements
- New `openingMonths` field on the Attraction data model — represent as e.g. a `number[]` of open months (1–12) or a 12-boolean map; default/absence means open all year. Update all three required locations per project convention: TypeScript interface in `src/types/`, TypeScript interface in `src/models/Attraction.ts`, and the Mongoose schema in the same file.
- Add a month-selector control to `src/components/NewAttractionModal/NewAttractionModal.tsx` (create + edit) — needs a Design Brief for the interaction pattern (e.g. a 12-cell toggle grid similar in spirit to the existing weekly `OpeningHoursGrid`, or a range picker). Default state on a new attraction: all months selected (year-round).
- In `src/app/trips/[id]/CalendarSection.utils.ts`'s `getClosedAlert()` (or a sibling function), add a check: if the attraction has `openingMonths` set to less than all 12 and the scheduled `plannedDate`'s month isn't included, produce a `ScheduleAlert` (same rendering path as the existing hours-closed alert, via `ScheduleAlertList.tsx`).
- An attraction with all 12 months open should behave exactly as today (no chip, no alert) — see [[permanently-closed-chip]] and the "year-round" chip needed by [[consolidate-attraction-card-chips]] for the corresponding display-side chip (not this task's scope to build the chip itself, but do expose whatever helper is needed to detect "year-round" for that task to consume, e.g. `isYearRound(openingMonths)`). That future chip belongs in the dedicated status-chips section described in [[consolidate-attraction-card-chips]] — not the existing `.badges` icon row (visited/used-in-trips/children-count) on `AttractionGridCard.tsx`.

## Constraints
- Per project learnings: adding a new Mongoose schema field requires restarting the dev server before it will persist — flag this to the user when manually verifying.
- Per project learnings on data-shape migrations: existing attractions in the DB have no `openingMonths` field. Reads must treat missing/undefined as "all year" (year-round default) rather than requiring a migration script, since the default is equivalent to "field absent."
- Grep every reader of the Attraction type/schema before assuming this is additive-only — check `formatAttraction` in `src/models/Attraction.ts` for any place that spreads/validates known fields explicitly.

## Out of scope
- Multi-range seasonal patterns (e.g. "open March–May and Sept–Nov" is fine to support via a simple month-set; no need for a separate "ranges" UI beyond a flat set of selected months).
- Retroactively backfilling existing attractions with real seasonal data — this task only adds the capability.
