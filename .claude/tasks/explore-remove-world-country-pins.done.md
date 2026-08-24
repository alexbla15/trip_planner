# Task: Remove redundant country pins from Explore's world view

Status: done

Track: B
Track reason: pure removal of an existing, redundant layer — no new visual pattern, nothing left to design.

## Problem
At Explore's world view, each country renders twice: once as a colored boundary polygon/circle (with its own click handler + tooltip showing name and attraction count), and again as a separate pin `Marker` on top at the same location. The pin adds visual noise without adding information the boundary/tooltip doesn't already carry.

## Goal
World view shows only the colored country boundaries/circles (as it already does) — the redundant per-country pin markers are gone. Clicking the boundary still navigates into the country (unchanged).

## Requirements
- Remove the `view === "world"` pin `Marker` block in `src/app/explore/ExploreMapWidget.tsx` (currently rendering `makeCountryMarkerIcon()` per country).
- Boundary/circle click-to-navigate and tooltip (name + attraction count) behavior must be unaffected — that's on the `GeoJSONLayer`/`Circle` block already, not the pin.
- No change to country view or city view (their own pins/markers are untouched — this is world-view only).

## Constraints
- `src/app/explore/ExploreMapWidget.tsx` — the pin block is lines ~234-247 (`countries.map(...)` rendering `<Marker icon={makeCountryMarkerIcon()} .../>`), immediately after the boundary/circle block it duplicates.
- Check whether `makeCountryMarkerIcon` (in `src/lib/mapIcons.tsx`) is used anywhere else before removing it as dead code.

## Out of scope
- Country-view city-pin clustering (separate task, `explore-country-view-pin-clustering.md`).
- Any change to the boundary/circle rendering itself.

## Implementation Notes
- Files modified:
  - `src/app/explore/ExploreMapWidget.tsx` — removed the `view === "world"` pin `Marker` block; boundary/circle click-to-navigate and tooltip were already on the `GeoJSONLayer`/`Circle` block, untouched.
  - `src/lib/mapIcons.tsx` — removed the now-dead `makeCountryMarkerIcon` function and its `Globe` import; kept `COUNTRY_MARKER_COLOR` (still used by `makeCityMarkerIcon`, just a reused/misleadingly-named constant, left as-is to avoid unrelated churn).
  - `src/lib/mapIcons.constants.ts` — removed the now-unused `COUNTRY_MARKER_SIZE_PX`.
- Deviations: none.
- New design tokens used: none — pure removal.
- Verified live via Playwright: world view shows 0 marker-pane icons (confirmed via `.leaflet-marker-pane` element count) — only the colored boundaries — and clicking a country's boundary still navigates into it correctly (Germany → country view). `tsc --noEmit` clean.

## Completion Summary
Removed the redundant per-country pin markers from Explore's world view — countries were rendering twice (colored boundary + a separate pin on top); now only the colored boundary/circle remains, as requested. Verified live. Confirmed by user. Closed 2026-08-24.
