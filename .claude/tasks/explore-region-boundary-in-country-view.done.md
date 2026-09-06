# Task: Render regions as map boundaries in country view, not pins

Status: done
Track: B
Track reason: extends the just-shipped region-boundary lookup (`/api/geo/region`) into the country-level map, following the exact pattern already used for country polygons in world view — no new visual pattern

## Problem
Country view currently renders regions as clustered pin markers (`CityPinsLayer`, same
component/style as standalone cities), even though regions can now have a real boundary
polygon (`explore-region-real-boundary`, just shipped). World view already shows each
country as a real boundary shape (or circle fallback), not a pin — country view should
treat regions the same way, since a region is a similarly area-shaped concept, not a point.

## Goal
In country view, each region renders as a boundary polygon (or circle fallback, exactly
like the region-view/world-view fallback already does) directly on the map — colored and
clickable like world view's country shapes — instead of being clustered into pin markers.
Standalone (unregioned) cities keep rendering as pins, unchanged.

## Requirements
- Fetch each region-in-country's boundary the same way world view already fetches every
  country's boundary (`countryBoundaries` state + effect in `ExploreMapWidget.tsx`) — a
  parallel `regionBoundaries: Map<string, GeoJsonObject | null>` populated when the
  `regions` prop changes
- In country view, render each region as a `GeoJSONLayer` (real boundary) or `Circle`
  (fallback, using the region's own centroid/radius) — mirroring the exact world-view
  country-rendering block (`{view === "world" && countries.map(...)}`), including a
  tooltip (region name + attraction count) and a click handler (`onRegionClick`)
  colored via `colorForBoundaryIndex` (same categorical palette world view's countries use)
  so multiple regions in one country are visually distinct from each other
- Remove the region entries from the `CityPinsLayer`/pin-clustering path in country view —
  `unregionedCitiesInSelectedCountry` keeps using it, `regions` no longer does
- Region view (one level deeper) and its own single-region boundary rendering are
  unaffected — this task only changes how regions are drawn at the country level, before
  one is selected

## Constraints
- Don't change how a country with no regions renders (no regions to draw, nothing to
  change)
- Reuse `colorForBoundaryIndex` rather than inventing new colors — keep the amber
  single-region-selected style for region view/world-view fallback distinct from this
  multi-region-at-once categorical coloring, matching how world view already separates
  "many countries, categorical colors" from "one selected country, amber" today

## Out of scope
- Any change to world view or region view's own rendering
- Any change to how standalone/unregioned city pins render

## Implementation Notes
- Files created/modified:
  - src/app/explore/ExploreMapWidget.tsx (new `regionBoundaries` Map + fetch effect mirroring `countryBoundaries`; country-view now renders each region via `GeoJSONLayer`/`Circle` fallback, categorically colored via `colorForBoundaryIndex` + tooltip + `onRegionClick`, mirroring the world-view country block exactly; `CityPinsLayer` in country view now only carries `unregionedCitiesInSelectedCountry`, regions removed from the pin-clustering path)
  - src/app/api/geo/region/route.ts (added `REGION_SEARCH_OVERRIDES` — the region-migration's chosen display labels don't all match Nominatim's actual gazetteer naming; Iceland's English tourism-style names resolve to unrelated POIs where the native Icelandic administrative name resolves correctly, and Georgia's invented "Kazbegi / Georgian Military Highway" label has no real match while the actual administrative region it describes, Mtskheta-Mtianeti, does. Search term is swapped, stored `region` value and everything the user sees stays unchanged)
  - Cleared 7 stale cached-null `GeoBoundary` DB entries for the regions above (one-off, not a code change) so they re-resolve with the new override term instead of replaying the old no-match result
- Deviations from task requirements: added the search-term override map, which wasn't in the original task scope — necessary because without it, the newly-added boundary lookup would have silently kept falling back to circles for 7 of 12 total regions, defeating the point of this task for most of the data
- New design tokens used: none — reused `colorForBoundaryIndex`'s existing categorical palette
- Verification: tsc clean; eslint at the same pre-existing baseline pattern; live-verified via the actual /api/geo/region route (not just raw Nominatim) that all 6 Iceland regions + Georgia's Kazbegi corridor now return real Polygon/MultiPolygon geometry
- Known limitation, NOT fixed here: most of Israel's 11 neutral geographic region names (Galilee, Gush Dan, Shfela, Jerusalem Hills, etc.) don't resolve to real Nominatim polygons at all — they're genuinely not indexed as administrative/place boundaries in OSM's data for Israel (queries return an unrelated lake, a shop, a cemetery, a road). This isn't fixable with a better search string; it would need a different boundary data source entirely. These regions will keep showing the circle fallback. Flagged to the user, not silently left broken.

## Completion Summary
Regions now render as real boundary shapes (or circle fallback) directly in country view, mirroring world view's country rendering; added Nominatim search-term overrides fixing 7 of 12 regions (all 6 Iceland regions + Georgia's Kazbegi corridor) that previously fell back to circles due to a label/gazetteer mismatch. Israel's regions remain a genuine OSM data-availability limitation, flagged not fixed. Confirmed by the user 2026-09-06.
