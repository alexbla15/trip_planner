# Task: Analytics — City Map Region Boundaries

Status: intake

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
