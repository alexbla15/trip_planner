# Task: Explore City Drill-Down Hides Attractions That Are Only Linked to a Private Trip

Status: done

Track: B
Track reason: Bug fix — wrong/incomplete data returned by an existing query due to overly broad privacy filtering; no new UI surface.

## Problem
Reported as "in Tbilisi I can see only one attraction on the map" — investigated and confirmed as a broader bug, not city-specific. `GET /api/attractions?city=X` (used by Explore's city drill-down, `getAttractionsByCity` in `src/services/attractions.service.ts:13-16`) runs its results through `searchAttractions`'s "hidden ids" filter (`src/lib/services/attractions.service.ts:54-84`): any attraction referenced by a private trip and *not* also referenced by a trip the current viewer can access gets excluded via `$nin`.

This filter's premise doesn't fit the Explore use case. Attractions are global, shared place records (name, location, opening hours) — not private trip-planning details. 30 of Tbilisi's 31 attractions are linked to one user's private trip ("Georgia 2022") and no public trip, so anyone browsing Explore who isn't that trip's owner/collaborator sees only 1 of 31. Meanwhile `GET /api/attractions/cities` (which builds the city list and its `count`) has no such filter, so the aggregate count and the drill-down result disagree — exactly the symptom reported.

This will reproduce for any city where attractions were bulk-added into a private trip, not just Tbilisi/Georgia.

## Goal
Per user decision: Explore's city drill-down always shows every attraction with coordinates in the selected city, regardless of which trips (private or public) reference it — matching how the city-list/count endpoint already has no such filter. The existing hidden-ids privacy filter should keep working exactly as before for its other caller(s) (trip-scoped attraction search, e.g. `AttractionSearchModal` via `searchAttractionsByCountry`) — this is a scoped opt-out for the Explore path, not a removal of the filter everywhere.

## Requirements
- Add an explicit way for a caller of `GET /api/attractions` to opt out of the hidden-ids filtering (e.g. a new query param, or a parameter on `searchAttractions` in `src/lib/services/attractions.service.ts`), defaulting to the current (filtered) behavior everywhere it's not explicitly requested
- Wire `getAttractionsByCity` (`src/services/attractions.service.ts:13-16`) — and only this call site — to request the unfiltered behavior
- Do **not** change behavior for `searchAttractionsByCountry` or `searchAttractionsByType` (both used by trip-scoped search/pickers) — they keep the existing hidden-ids filtering exactly as-is
- Verify against real data: re-fetch Tbilisi's attractions through the Explore path after the fix and confirm all ~31 (not 1) are returned, and separately confirm the trip-scoped search path still correctly hides a private-trip-only attraction from an unrelated searcher (don't just assume the existing behavior is preserved — check it)

## Constraints
- Don't touch `GET /api/attractions/cities` (already unfiltered, already correct) or the country-boundary/polygon endpoints (unrelated, already fixed in a separate task)
- Don't change the underlying `isPrivate`/trip-membership data model — this is a query-filtering change, not a schema change

## Out of scope
- Broader privacy-model rework (e.g. whether attractions should ever be markable private themselves) — out of scope, not reported as a problem
- The Tbilisi map-marker rendering code itself — confirmed already correct (keyed by `_id`, no dedup logic); the bug is entirely in what data reaches it

## Implementation Notes
- Files modified: `src/lib/services/attractions.service.ts` (new `includeHidden` param on `SearchAttractionsParams`; hidden-ids computation now skipped when true), `src/app/api/attractions/route.ts` (reads `?includeHidden=true` query param), `src/services/attractions.service.ts` (`getAttractionsByCity` — and only this function — now sends `includeHidden=true`)
- Deviations from requirements: none
- New design tokens used: none — logic/API-only change, no UI
- **Verified live against real data, both paths, not just reasoned about:**
  - `GET /api/attractions?city=Tbilisi` (no `includeHidden`) → 1 attraction (unchanged default behavior)
  - `GET /api/attractions?city=Tbilisi&includeHidden=true` → 31 attractions (matches the city-list aggregate count exactly, confirming the fix)
  - `GET /api/attractions?country=Georgia` (the trip-scoped search path, unauthenticated) → still 1 attraction, confirming `searchAttractionsByCountry`'s existing privacy filtering is untouched by this change
- `tsc --noEmit` and `eslint` both clean, zero findings.

## Completion Summary
Fixed Explore's city drill-down showing only 1 of 31 Tbilisi attractions (and any similarly-affected city) by adding an opt-in `includeHidden` flag that lets Explore's city view skip the "hidden by private trip" filter meant for trip-scoped search, while every other caller keeps the existing filtered behavior unchanged. Verified live: Explore now returns the full attraction count matching the city-list aggregate, and the trip-scoped country search path still correctly filters as before. Confirmed by user. Closed 2026-07-30.
