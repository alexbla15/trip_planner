# Task: Show City Boundaries (Not Pins) When a Country Is Selected on Explore

Status: done

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

## Design Brief

### Precedent already fully established — replicate, don't redesign
`src/app/explore/ExploreMapWidget.tsx` already does exactly this pattern twice:
- World view (lines 73-84, 123-161): fetches a boundary per country in parallel via `getCountryBoundary(name)`, stored in a `Map<string, GeoJsonObject | null>` state (`countryBoundaries`), rendered as a `GeoJSONLayer` when present, falling back to a `Circle` (using the country's centroid + a radius) when the boundary lookup fails.
- Single-city view (lines 67, 86-91, 221-247): fetches one boundary via `getCityBoundary(cityName, country)` (already wired to the existing `GET /api/geo/city` endpoint), rendered as a `GeoJSONLayer`, falling back to an 8km `Circle` when null.

The country-selected view's city pins (lines 206-219, plain `Marker`s with `makeCityMarkerIcon()`) are the only place still using point markers instead of this boundary+fallback pattern. Apply the identical technique used for `countryBoundaries` — just scoped to `citiesInCountry` instead of `countries`, and using `getCityBoundary` instead of `getCountryBoundary`.

### Implementation shape
- Add a `cityBoundaries` state: `Map<string, GeoJsonObject | null>` keyed by city name, populated by a `useEffect` that fires `getCityBoundary(city.name, selectedCountry)` in parallel for every entry in `citiesInCountry` whenever it changes (mirrors the existing `countries`-driven effect at lines 73-84 exactly).
- In the country-view render block (lines 206-219), replace the flat `citiesInCountry.map(...)` of `Marker`s with the same conditional pattern used for world-view countries: if `cityBoundaries.get(city.name)` has a value, render a `GeoJSONLayer`; otherwise fall back to the existing `Marker` (so a city with no resolvable boundary still shows a pin, per the task's own requirement — don't drop it from the map).
- Keep a `Marker` rendered on top of every city boundary too (same as the world view renders both a `GeoJSONLayer` *and* a `Marker` for countries, lines 123-175) — this preserves the existing tooltip-on-hover and click-to-drill-in interaction exactly as it works today, since clicking a filled polygon shape is a smaller/less predictable hit target than a pin, especially on mobile.

### Visual style
- Color: reuse the single-city view's existing blue (`color: "#0369A1", fillColor: "#38BDF8"`, `fillOpacity: 0.18`) — this is already this app's established "city-level boundary" identity color (distinct from the country view's orange `#B45309`/`#F59E0B`), so multiple city boundaries within a selected country read as "cities" at a glance, consistent with what the user sees one level deeper (the single-city view) and one level shallower (world-view countries use blue too, coincidentally reinforcing rather than conflicting).
- Weight: `2.5` (matching the world-view country boundary weight, one step lighter than the single-city view's `3`, since multiple overlapping-ish shapes at this zoom level benefit from a slightly less heavy outline) — developer's call if `3` reads better in practice once real shapes are on screen.
- Click handler: `onCityClick(city)` on both the `GeoJSONLayer` and the `Marker`, matching the existing single-marker behavior.

### Accessibility / interaction
- No change to keyboard/screen-reader behavior needed beyond what already exists for the analogous country-boundary pattern (Leaflet vector layers aren't natively keyboard-focusable either way, consistent with the existing world/city views — not a new gap introduced by this task).
- Tooltip content (city name + attraction count) stays exactly as today, just now bound to `onEachFeature` for the polygon case (matching the world-view country pattern at line 138) in addition to the `Marker`'s existing `Tooltip` child.

No new icons needed — `makeCityMarkerIcon()` already exists and keeps being used for the pin (both as the fallback and as the always-present marker layered on top of each boundary).

## Implementation Notes
- Files modified: `src/app/explore/ExploreMapWidget.tsx` — added `cityBoundariesInCountry` state + a parallel-fetch `useEffect` over `citiesInCountry` (mirrors the existing `countryBoundaries` effect exactly), and replaced the country-view's single `Marker`-only render block with a boundary-layer pass (renders `GeoJSONLayer` only when a boundary was resolved) plus the existing always-present `Marker` pass underneath/on top (same two-pass structure the world view already uses for countries)
- Deviations from brief: none
- New design tokens used: none — reused the existing city-boundary blue (`#0369A1`/`#38BDF8`) and the world-view's `2.5` weight, exactly as specified
- Verified live: `GET /api/geo/city?name=Tbilisi&country=Georgia` returns a real `Polygon` for Tbilisi — confirms the per-city boundary lookup this task wires up actually resolves real data, not just that the code compiles
- `tsc --noEmit` clean. `eslint` flagged one pre-existing `react-hooks/set-state-in-effect` finding at line 91 — confirmed via `git diff` this is unmodified code from before this task (the existing single-city boundary effect), not a new issue introduced here; the new effect added by this task uses callback-based `setState` inside `.then()/.catch()` (not synchronous body `setState`), which doesn't trigger the rule.

## Follow-up fixes requested during review

1. **Leaflet z-index overflowing page chrome:** `.mapArea` in `ExploreClient.module.css` only had `isolation: isolate` on its mobile override, not the desktop base rule — so Leaflet's internal panes (up to z-index 700) could escape above the fixed `Navbar` (z-index 100/150), overlapping its title/mobile-menu-X. Fixed by adding `isolation: isolate` to the base `.mapArea` rule.

2. **"Almost all Iceland cities don't show boundaries" — real bug, root-caused via live reproduction, not assumed:** the parallel `citiesInCountry.forEach(city => getCityBoundary(...))` fetch (same pattern already used for `countryBoundaries`) fires every city's Nominatim request simultaneously with zero throttling. Nominatim's usage policy caps requests to ~1/sec; a burst of Iceland's 8 cities mostly got `429`'d, and the old in-memory-only cache stored those transient failures as permanent `null`s until the next server restart — and restarts happened often this session. Reproduced live: an unthrottled parallel burst against the 8 Iceland cities returned mostly non-`200`/empty results; after the fixes below, 6 of 8 resolved real polygons (confirmed via direct DB check), and the remaining 2 (`Vík í Mýrdal`, and the originally-reported `Staðarsveit`) were independently confirmed against the raw Nominatim API to genuinely have no `Polygon`/`MultiPolygon` in OpenStreetMap (only a bare `Point`, or no result at all under any name variant tried) — a real data-availability gap, not a bug, correctly handled by the existing pin fallback.
   - **Fix 1 — persistent cache, per user request ("can't you store the results?"):** new `GeoBoundary` Mongoose model + `src/lib/geoBoundaryCache.ts` (`getCachedBoundary`/`setCachedBoundary`), used by both `src/app/api/geo/country/route.ts` and `.../geo/city/route.ts` in place of the old process-local-only `Map`. A resolved boundary (or a confirmed empty result from a successful Nominatim response) is now persisted in MongoDB and survives server restarts — previously every restart threw away all progress and re-risked hitting the rate limit from scratch. Verified live: after a batch of lookups, querying the `geoboundaries` collection directly showed 14 persisted entries.
   - **Fix 2 — correctness fix within the caching change:** a non-OK Nominatim response (e.g. `429`) is deliberately **not** persisted (this differs from the old code, which cached `429`s as permanent `null`s) — only a successful response's result (real polygon or a genuine empty result) is safe to treat as a stable answer.
   - **Fix 3 — throttling:** new `src/lib/nominatimThrottle.ts` (`queueNominatimFetch`) serializes all outgoing Nominatim requests from both geo routes through a shared queue, spaced ≥1.1s apart, so a burst of cache-miss lookups (e.g. every city in a country on first view) can't exceed Nominatim's rate limit in the first place. Verified live: a batch of 14 lookups showed timestamps consistently ~1.1s apart in the persisted cache, all succeeding.

3. **Distinct colors per boundary, so multiple shapes in the same view are distinguishable:** new `src/lib/mapBoundaryColors.ts` (`colorForBoundaryIndex`), a categorical palette reusing the app's existing Mood Tag Colors hues (`docs/DESIGN_SYSTEM.md`) rather than inventing new colors. Initially implemented as a name-hash (`colorForBoundary(name)`), but testing the hash against real data showed collisions among Georgia's cities (8 cities into 8 buckets collided per the birthday paradox) — switched to **position-in-the-currently-rendered-list** indexing instead (`colorForBoundaryIndex(i)` from each `.map((x, i) => ...)`), which guarantees every simultaneously-visible boundary is distinct as long as there are ≤8 of them (true for every country/city list in the app today), rather than relying on hash luck.
4. **City name shown inside the boundary instead of a pin:** when a city's boundary resolves, it now renders a permanent, centered Leaflet tooltip (`layer.bindTooltip(..., { permanent: true, direction: "center" })`, styled via a new `.cityBoundaryLabel` class — flat "map label" look, not the default hover-tooltip chrome) showing the city name + attraction count. The pin (`Marker`) is now only rendered as the fallback for a city whose boundary couldn't be resolved, per the earlier design's own stated fallback requirement.

All of the above verified with `tsc --noEmit` (clean) after each change; final `eslint` pass shows only the same pre-existing findings already noted above, no new ones from this round.

## Second follow-up round

1. **Z-index — `isolation: isolate` alone wasn't enough, per user report:** added an explicit `.mapArea :global(.leaflet-container) { z-index: -1; }` rule, directly pinning Leaflet's root container below everything else, as requested.
2. **City labels: drop the attraction count, and don't show a label at all when it wouldn't fit cleanly:**
   - Permanent boundary labels now show just the city name (dropped the `· N` count suffix).
   - Added zoom-aware size gating: a new `ZoomWatcher` child component (mirrors the existing `MapController` pattern) reports the map's current zoom; `boundaryFitsLabel(map, boundary, zoom)` uses `L.geoJSON(boundary).getBounds()` + `map.project(...)` to compute the boundary's actual on-screen pixel width/height at that zoom, and only renders the boundary-with-label when it's at least 70×32px. Below that threshold — a small city, or zoomed out far enough that it would look cramped or crowd its neighbors — it falls back to the same pin-with-hover-tooltip already used when no boundary resolves at all. Recomputed live on every `zoomend`, so zooming in on a cluster of small cities progressively reveals labels as they'd have room.
   - **Known limitation, noted rather than silently glossed over:** this is a per-city size threshold, not true pairwise label-collision detection between different cities — it correctly handles "too small to show a label" but doesn't explicitly check whether two *adjacent*, individually-large-enough cities' labels would visually touch each other. In practice, tightly clustered cities are usually small relative to the view at that zoom, so the size threshold catches most real crowding — but a genuine collision solver (measuring actual rendered label DOM boxes pairwise) would be a further follow-up if this size-based approximation doesn't fully match what the user sees in practice.
- `tsc --noEmit` clean; `eslint` shows the same single pre-existing finding as before (line number only shifted due to inserted code above it) — confirmed unrelated to this round's changes.

## Completion Summary
City boundaries now render (with distinct colors and an in-shape name label) after selecting a country on Explore, replacing plain pins wherever a boundary resolves and fits cleanly at the current zoom. Along the way, fixed a real burst-rate-limiting bug against Nominatim (added a persisted MongoDB cache + a request throttle), a Leaflet z-index leak over the page's Navbar, and an unrelated `next/image` hostname error on attraction photos. Confirmed by user across several review rounds. Closed 2026-07-31.
