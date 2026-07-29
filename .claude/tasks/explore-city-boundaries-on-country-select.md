# Task: Show City Boundaries (Not Pins) When a Country Is Selected on Explore

Status: intake

Track: A
Track reason: New map visualization behavior/interaction (boundary polygons in place of point pins for a view that currently only shows pins) — not a bug fix or existing-pattern tweak.

## Problem
On the Explore world map, after picking a country, the cities within it that have attractions are shown as point pins. When picking an individual city instead, the map shows that city's actual boundary (polygon), which reads as more informative/immersive. The pin-based city view after a country selection is comparatively flat and inconsistent with the per-city boundary view.

## Goal
After selecting a country on the Explore map, cities with attractions inside it render as their actual city boundaries (matching the visual treatment already used for the single-city view), instead of plain pins.

## Requirements
- Identify the existing per-city boundary rendering (likely reusing the same Nominatim-backed boundary lookup used for countries, `GET /api/geo/country` per `docs/LEARNINGS.md`'s Nominatim entry — check whether an analogous `GET /api/geo/city` already exists and is used for the single-city view)
- After a country is selected, fetch/display boundaries for each city (with attractions) inside it, replacing the current pin markers for that view
- Handle a city with no resolvable boundary (Nominatim lookup fails/empty) gracefully — fall back to a pin for that specific city rather than breaking the whole view
- Preserve existing interactions on top of the new boundary shapes (clicking a city to drill in further, hover states, etc. — whatever the current pins support)

## Constraints
- Reuse the existing city-boundary-fetching mechanism if one already exists (don't build a second, parallel implementation) — investigate `CitiesMap`/`CountriesMap` (`src/components/`) and `GET /api/geo/city` before designing new fetch logic
- Follow the same caching/rate-limit-friendly pattern already established for country boundaries (module-scope cache, `revalidate: 86400`) if a new endpoint or query path is needed

## Out of scope
- Changing the country-boundary view itself (already works, not being touched)
- Adding boundaries to any other map surface outside Explore
