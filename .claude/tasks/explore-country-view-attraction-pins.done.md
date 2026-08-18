# Task: Explore Country View Shows Attraction Pins Instead of City Pins

Status: done

Track: B
Track reason: Replaces one map-marker rendering strategy with an already-established one (city view's own attraction-pin block, reused as-is) — no new visual pattern, no new component.

## Problem
In Explore's country view, the map showed city-level markers/boundaries (one pin or shape per city), requiring a click-through to a specific city before seeing any individual attractions on the map.

## What shipped
- `src/services/attractions.service.ts`: new `getAttractionsByCountry(country, token)` — paginates through `GET /api/attractions?country=...` (capped at 20/page server-side for country-only queries, an existing deliberate constraint tuned for the search-modal typeahead) using the `X-Total-Count`/`X-Limit` response headers, returning every attraction in the country in one call.
- `ExploreClient.tsx`: new `countryAttractions` state + fetch effect (mirrors the existing city-attractions effect, fires when a country is selected and no city yet); `filteredCountryAttractions` applies the existing global visited filter (category/type filters stay city-view-only, unchanged). The map widget's `attractions` prop now switches based on view: `filteredCountryAttractions` in country view, `filteredAttractions` in city view.
- `ExploreMapWidget.tsx`: removed the entire per-city breakdown in country view (city boundary polygons/labels, the marker fallback, and all the machinery that only existed to support it — `cityBoundariesInCountry` state + its fetch effect, `ZoomWatcher`/`mapInstance`/`mapZoom`/`boundaryFitsLabel`/`MIN_LABEL_*` constants, the `citiesInCountry`/`onCityClick` props). The existing attraction-marker block (pin color/icon by type, visited border, click-to-open-detail) now renders for `view === "country" || view === "city"` instead of `city` only — country view gets the exact same pin treatment as city view, just for every attraction in the country at once.
- `src/lib/mapIcons.tsx`: removed `makeCityMarkerIcon` (no longer called anywhere after the above).
- Behavior change: clicking a city shape/pin on the map to drill into it is no longer possible (that affordance is removed along with the per-city breakdown) — city navigation is still available via the sidebar's city list, unaffected by this change. The country's own outer boundary/circle (the single shape for the whole country) is untouched.

## Verification
- `tsc --noEmit`: clean.
- `eslint`: one new `react-hooks/set-state-in-effect` instance (the new country-attractions fetch effect) — same rule already triggered by every other data-fetching effect throughout this codebase this session, treated consistently as the established (if imperfect) convention; no other new issues, and no unused-import/dead-code warnings from the removed `ZoomWatcher`/`boundaryFitsLabel`/`makeCityMarkerIcon`/props.
- Live-verified `getAttractionsByCountry`'s pagination against the real API using a country with 79 attractions (well over the 20-per-page cap): fetched across 4 pages, 79 unique results, no duplicates or gaps.

## Completion Summary
Explore's country view now shows individual attraction pins across the whole country (same styling/behavior as city view), replacing the previous city-level marker/boundary breakdown. Clicking a city on the map to drill in was removed along with it — city navigation remains available via the sidebar's city list. Confirmed closed by the user 2026-08-18.
