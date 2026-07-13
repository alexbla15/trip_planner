# Task: Analytics — City Map Region Boundaries

Status: done

Track: A
Track reason: new visual pattern — polygon boundaries on map instead of circles, with country highlight interaction

## Problem
The "Cities" map view in `/analytics` currently shows circles for each city. This is imprecise and visually weak. Users also have no visual feedback when selecting a country — nothing highlights the country region.

## Goal
The analytics cities map shows real geographic boundary polygons for each city, and selecting a country highlights its boundary polygon.

## Requirements
- Replace city circles with Nominatim-fetched boundary polygons (same proxy pattern used in `/explore`)
- Each city polygon has a clearly visible stroke color and a light fill with a visible margin/gap between polygons
- When the user selects a country in the analytics filter, that country's boundary polygon is highlighted (distinct fill + stroke color)
- Polygons load progressively — skeleton/circle fallback while fetching
- Existing analytics drill-down behavior (clicking a city) is preserved

## Constraints
- Reuse the existing `/api/geo/city` and `/api/geo/country` proxy routes already built for `/explore`
- CSS Modules only
- Leaflet GeoJSON layer (already used in explore)

## Out of scope
- Changing the analytics data model or API
- Replacing the analytics map component entirely

## Implementation Notes
- Files modified: `src/app/analytics/AnalyticsCitiesMap.tsx`, `src/app/analytics/AnalyticsClient.tsx`
- Deviations from task requirements: none
- New design tokens used: none
- `AnalyticsCitiesMap` fetches city polygons via `/api/geo/city` progressively (one per city). Key `city._id` in the `cityBoundaries` Map; missing key = still loading → grey circle; key present but `null` = no polygon → sky-blue circle.
- `BoundsUpdater` inner component re-fits the map whenever the `cities` prop changes (e.g. when the country filter is applied).
- Country highlight polygon fetched via `/api/geo/country` when `selectedCountry` is set; rendered below city polygons with amber fill/stroke matching the explore map's country-view style.

## Completion Summary
Replaced city `CircleMarker` elements with Nominatim boundary polygons fetched progressively per city. Grey circle while loading, sky-blue circle as fallback when no polygon available, full `GeoJSONLayer` polygon when loaded. Country filter now also highlights the country boundary in amber. Map re-fits to bounds when the country filter changes. Confirmed by user on 2026-07-13.
