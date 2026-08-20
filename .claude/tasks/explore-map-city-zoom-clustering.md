# Task: Zoom-based city/attraction pin switching on Explore country map

Status: intake
Track: A
Track reason: new marker type (square city pins), new zoom-driven view logic — not an existing pattern in ExploreMapWidget or the design system

## Problem
`ExploreMapWidget.tsx` currently has three *selection-driven* (not zoom-driven) view states: `world` (one pin per country), `country`, and `city` — but "country" view renders every individual attraction pin at once with no aggregation (lines ~262-284, one `Marker` per attraction with coordinates). For a country with many attractions this is visually overwhelming. A separate component, `src/components/CitiesMap/CitiesMap.tsx` (used today only in Analytics/Profile, not Explore), already renders one aggregate circle marker per city with a count — but it's not wired into Explore and uses circles, not the requested square markers.

## Goal
When a user selects a country in Explore and is zoomed out, they see one pin per city (square markers, with some indication of attraction count); zooming in past a threshold reveals the individual attraction pins for that area instead.

## Requirements
- Add zoom-level awareness to the country view of `ExploreMapWidget.tsx` (Leaflet exposes zoom via map events/hooks — follow whatever pattern the rest of the codebase's Leaflet usage follows).
- Below a chosen zoom threshold: render one square marker per city (grouping the country's attractions by city/coordinate proximity), positioned at each city's representative location.
- At/above the threshold: render individual attraction pins as today (`makeAttractionMarkerIcon`), unchanged.
- Add a new square city-marker icon factory in `src/lib/mapIcons.tsx` (parallel to existing `makeCountryMarkerIcon`/`makeAttractionMarkerIcon`/`makeCustomPinIcon`) — square shape distinguishes it from the existing circular attraction/country markers.
- Clicking/zooming into a city pin should zoom the map in on that city (revealing its attractions), consistent with the existing city-selection flow already in `ExploreMapWidget.tsx`.
- Decide during implementation whether to reuse `CitiesMap.tsx`'s city-grouping logic (`CityEntry` grouping by lat/lng) or reimplement inline in `ExploreMapWidget.tsx` — reuse if the existing grouping utility isn't tightly coupled to Analytics/Profile-specific data shapes.

## Constraints
- `world` view (country-level pins) and `city` view (fully zoomed into one city) behavior are unchanged — this only affects the intermediate `country` zoom range.
- Keep existing attraction pin rendering/interactions (selection, visited state, measure tool) unchanged once zoomed in past the threshold.

## Out of scope
- Changing the Analytics/Profile `CitiesMap.tsx` component itself (only its grouping logic may optionally be reused).
- Marker clustering libraries/plugins — a simple zoom-threshold city/attraction switch is sufficient, not a full clustering library integration.
