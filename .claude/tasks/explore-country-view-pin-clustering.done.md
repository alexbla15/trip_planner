# Task: Declutter Explore's country-view city pins

Status: done

Track: A
Track reason: new interaction pattern (cluster markers, click-to-expand) not covered by existing map-marker tokens/components.

## Problem
In Explore's country view (e.g. Germany), city pins overlap and visually stack when several cities are geographically close together at the current zoom level (seen clustered near Munich) — reads as a messy pile of badges rather than a legible map.

## Goal
No overlapping/stacked pins at any zoom level within country view; the map stays legible and each city's attraction count is still discoverable.

## Requirements
Direction chosen with the user: **marker clustering**.
- City pins that would visually overlap/crowd at the current zoom level merge into a single cluster marker instead of stacking.
- Cluster marker shows the number of cities it contains (primary) and total attraction count across them (tooltip), visually distinct from a single-city pin (different color/size).
- Clicking a cluster zooms/pans to fit its member cities' bounding box, splitting it apart into individual (or smaller) clusters — standard "click to zoom in" cluster UX.
- Clusters recompute as zoom changes (re-cluster on zoom, not on pan — pixel distance between two fixed points only changes with zoom, not panning).
- Solo cities (no nearby neighbors) keep rendering exactly as today (single pin + count badge, click navigates into the city).
- No new npm dependency — implemented as a small custom pixel-distance clustering pass (greedy single-link over `map.latLngToContainerPoint`), consistent with this codebase's existing hand-rolled Leaflet DivIcon markers (`src/lib/mapIcons.tsx`) rather than a plugin like `leaflet.markercluster`.

## Constraints
- `src/app/explore/ExploreMapWidget.tsx` — city pins render at `view === "country" && showCityPins` (`citiesInSelectedCountry.map(...)`, using `makeCityMarkerIcon(c.count)`), gated by `CITY_PIN_ZOOM_THRESHOLD = 12`. Clustering needs `useMap()` for pixel-accurate projection (`latLngToContainerPoint`), so it has to live in a small sub-component rendered inside `<MapContainer>`, mirroring the existing `ViewportWatcher`/`MapController` pattern in the same file.
- Individual attraction pins (below the city-pin threshold, i.e. zoomed in further) are a separate, unaffected rendering path.

## Implementation Notes
- Files modified:
  - `src/lib/mapIcons.tsx` — new `makeCityClusterIcon(cityCount, totalAttractions)`: circular, distinct color/size from `makeCityMarkerIcon`'s square single-city pin, grows slightly with city count (capped).
  - `src/lib/mapIcons.constants.ts` — new `CLUSTER_MARKER_COLOR`/`CLUSTER_MARKER_BASE_SIZE_PX`/`CLUSTER_MARKER_MAX_SIZE_PX`.
  - `src/app/explore/ExploreMapWidget.tsx` — new `CityPinsLayer` sub-component (rendered inside `<MapContainer>`, uses `useMap()`): greedy single-link pixel-distance clustering (`CLUSTER_PIXEL_RADIUS = 45`) over `map.latLngToContainerPoint`, re-clustering only on zoom change (`useMemo` keyed on `[cities, zoom]` — pixel distance between fixed lat/lngs is zoom-dependent only, not pan-dependent). Solo cities render the existing single-pin marker unchanged; groups of 2+ render a cluster marker at the centroid, click handler calls `map.flyToBounds` on the member cities to zoom/pan and split the cluster apart. Replaced the old inline `citiesInSelectedCountry.map(...)` block with `<CityPinsLayer .../>`.
- Deviations from requirements: none.
- New design tokens used: `CLUSTER_MARKER_COLOR` (violet, #7C3AED) — chosen to be visually distinct from both the single-city marker's blue and the attraction-type marker colors; not a new design-system token, a map-specific constant alongside the existing marker color constants.
- Verified live via Playwright against Germany (450 attractions, 148 cities — the exact case from the messy screenshot): the previous stack-of-overlapping-pins near the Black Forest region now renders as one clean "145 cities" cluster marker; clicking it flies/zooms to fit that region and progressively splits into smaller clusters and individual pins (30 markers visible after one click, no overlap). `tsc --noEmit` clean.

## Completion Summary
Replaced Explore's country-view city pins with a lightweight pixel-distance clustering layer (no new dependency) — cities that would visually overlap at the current zoom now merge into a single cluster marker showing city count, which splits apart on click by zooming/panning to fit its members. Verified live against the exact messy Germany view from the original report. Confirmed by user. Closed 2026-08-24.

## Constraints
- `src/app/explore/ExploreMapWidget.tsx` — city pins render at `view === "country" && showCityPins` (`citiesInSelectedCountry.map(...)`, using `makeCityMarkerIcon(c.count)`), gated by `CITY_PIN_ZOOM_THRESHOLD = 12`.
- Individual attraction pins (below the city-pin threshold, i.e. zoomed in) are a separate, unaffected rendering path.

## Out of scope
- World-view country pins (separate task, `explore-remove-world-country-pins.md`).
- City-view (individual attraction pins within one city) — not reported as messy, not in scope.
