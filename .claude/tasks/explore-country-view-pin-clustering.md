# Task: Declutter Explore's country-view city pins

Status: intake

## Problem
In Explore's country view (e.g. Germany), city pins overlap and visually stack when several cities are geographically close together at the current zoom level (seen clustered near Munich) — reads as a messy pile of badges rather than a legible map.

## Goal
TBD — pending a design-direction decision with the user (see options below). Success looks like: no overlapping/stacked pins at any zoom level within country view; the map stays legible and each city's attraction count is still discoverable.

## Requirements
TBD — to be filled in once a direction is chosen.

## Constraints
- `src/app/explore/ExploreMapWidget.tsx` — city pins render at `view === "country" && showCityPins` (`citiesInSelectedCountry.map(...)`, using `makeCityMarkerIcon(c.count)`), gated by `CITY_PIN_ZOOM_THRESHOLD = 12`.
- Individual attraction pins (below the city-pin threshold, i.e. zoomed in) are a separate, unaffected rendering path.

## Out of scope
- World-view country pins (separate task, `explore-remove-world-country-pins.md`).
- City-view (individual attraction pins within one city) — not reported as messy, not in scope.
