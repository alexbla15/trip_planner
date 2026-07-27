# Task: Search "Explore the World" by Country/City, Not Just Trip Name

Status: done

Track: B
Track reason: Logic/data change to an existing search input's filter predicate and API payload — no new visual surface, reuses the existing search bar as-is.

## Problem
The "Explore the World" search on the homepage (`src/components/ExploreSection/ExploreSection.tsx`, "Search destinations…" input) only matches against `item.destination`, which is actually the **trip's name** (`destination: trip.name` in `src/app/api/explore/route.ts` line 48 — misleadingly named). A user searching "France" or "Paris" finds nothing unless the trip's name happens to literally contain that word, even though the trip data already includes a `country` field (`src/models/Trip.ts`) and a `cities` array (`ExploreItem.cities`, already deduplicated from the trip's attractions).

## Goal
Typing a country or city name into the Explore search finds matching trips, in addition to matching by trip name as it does today.

## Requirements
- `GET /api/explore` (`src/app/api/explore/route.ts`): add `country: trip.country` to the returned `ExploreItem` (select `country` in the Mongoose query alongside existing fields; it's already on the `Trip` model)
- `ExploreItem` type (`src/types/trip.ts`): add `country: string`
- `ExploreSection.tsx`'s filter predicate (currently `byTag.filter((i) => i.destination.toLowerCase().includes(query))`, line 32): match if the query is found in `destination` (trip name) **OR** `country` **OR** any entry in `cities`
- Update the search input's placeholder/`aria-label` if "Search destinations…" no longer accurately describes the broadened scope (developer's call on exact wording)

## Constraints
- Don't rename `destination` to something like `tripName` as part of this task — that's a larger refactor touching multiple files; just extend the filter logic. Flag the misleading name as a note for a future cleanup task if worth surfacing.
- Client-side filtering only — `items` are already fully fetched by `HomeClient.tsx`; no new API query params needed beyond the added `country` field

## Out of scope
- Renaming `ExploreItem.destination` for clarity
- Fuzzy/typo-tolerant matching — substring match (current behavior) is sufficient
- Adding country/city as separate filter chips (separate concern from free-text search)

## Implementation Notes
- Files created/modified: `src/app/api/explore/route.ts` (select + return `trip.country`), `src/types/trip.ts` (added `country: string` to `ExploreItem`), `src/components/ExploreSection/ExploreSection.tsx` (filter predicate now checks `destination`, `country`, and each entry in `cities`; updated placeholder/aria-label to "Search trips, countries, cities…"), `swagger.yaml` (documented new `country` field on `/api/explore` response schema)
- Deviations from task requirements: none
- New design tokens used: none — logic/API-only change, no new UI
- `tsc --noEmit` clean. Confirmed no other call site constructs `ExploreItem` manually (only the API route builds it), so no other file needed updating for the new required field.

## Completion Summary
The Explore search now matches trip name, country, or city, instead of trip name only. Confirmed by user. Closed 2026-07-27.
