# Task: Region view should show a real boundary polygon, not just a circle

Status: done
Track: B
Track reason: bug fix / consistency gap — region was the only drill-down level without the boundary-lookup pattern country/city already have; no new UI pattern

## Problem
Country and city views show a real geographic boundary polygon (fetched from OpenStreetMap
Nominatim via `/api/geo/country` and `/api/geo/city`), falling back to a plain circle only
when no polygon is found. Region view (shipped in `explore-region-drilldown`) only ever
showed a circle — the Design Brief for that task assumed no real boundary source existed
for a user-labeled region, but many region values are actually real, Nominatim-resolvable
places (e.g. "Black Forest", "US-NY", "Lake Garda"), so the assumption was wrong for most
of the migrated data (Germany, Italy, Iceland, Israel, USA) — only Georgia's invented
composite label ("Kazbegi / Georgian Military Highway") genuinely has no real boundary.

## Goal
Region view follows the exact same real-boundary-with-circle-fallback pattern country and
city already use.

## Requirements
- New `GET /api/geo/region` route (`src/app/api/geo/region/route.ts`), mirroring
  `/api/geo/city`'s caching/proxy behavior: query Nominatim for `${region}, ${country}`,
  extract the first Polygon/MultiPolygon feature; if nothing resolves, retry the bare
  region name alone (some values, e.g. a US state code, resolve better without the country
  suffix); cache the result (including a genuine "no polygon found" null) the same way
  `/api/geo/city`/`/api/geo/country` already do
- New `getRegionBoundary(name, country?)` client service function
  (`src/services/geo.service.ts`), exported from `src/services/index.ts`
- `ExploreMapWidget.tsx`: fetch the region boundary when `selectedRegion` changes (mirrors
  the existing `cityBoundary` effect exactly); render it via `GeoJSONLayer` when found, the
  existing circle fallback otherwise — same amber styling as before
- Document the new route in `swagger.yaml`, matching the existing `/api/geo/city`/
  `/api/geo/country` entries

## Constraints
- Don't touch the country/city boundary logic — this only adds the missing region case
- Keep the graceful-degradation contract identical to city/country: `null` is a normal,
  cacheable answer, not an error

## Out of scope
- Any change to which regions exist in the DB or how they were migrated
- Any UI change beyond the boundary itself (region view's sidebar/list/grid are unchanged)

## Implementation Notes
- Files created/modified:
  - src/app/api/geo/region/route.ts (new — mirrors /api/geo/city's Nominatim proxy/cache pattern, with a bare-name retry when the country-scoped query finds nothing)
  - src/services/geo.service.ts (new getRegionBoundary function)
  - src/services/index.ts (export it)
  - src/app/explore/ExploreMapWidget.tsx (new regionBoundary state + fetch effect mirroring cityBoundary's; region rendering block now tries GeoJSONLayer(regionBoundary) first, circle fallback only when null)
  - swagger.yaml (documented GET /api/geo/region, matching the existing /api/geo/city and /api/geo/country entries)
- Deviations from task requirements: none
- New design tokens used: none (same amber styling reused)
- Verification: tsc clean, YAML valid, eslint at the same pre-existing baseline pattern (+1 consistent instance of the already-existing set-state-in-effect pattern the sibling cityBoundary effect also has — not a new issue). Live-verified against the real dev server + Nominatim: `/api/geo/region?name=Black Forest&country=Germany` resolves to the real Schwarzwald polygon (confirmed rendering on the map, replacing the circle); `/api/geo/region?name=Kazbegi / Georgian Military Highway&country=Georgia` correctly returns null and falls back to the circle.

## Completion Summary
Region view now shows a real boundary polygon fetched from Nominatim via a new /api/geo/region route, falling back to the existing circle only when the region name doesn't resolve to a real place. Verified live (Black Forest -> real Schwarzwald polygon; Georgia's invented label -> correct circle fallback). Confirmed by the user 2026-09-06.
