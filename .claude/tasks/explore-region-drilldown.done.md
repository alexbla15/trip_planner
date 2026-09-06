# Task: Insert Region into Explore's drill-down (World → Country → Region → City → Attraction)

Status: done
Track: A
Track reason: new UI level in Explore's core map/grid drill-down — map pin treatment for a new tier, breadcrumb changes, mixed regioned/unregioned display within one country — not covered by existing design-system patterns

Goal: [[region-level-hierarchy]] (task 4 of 4, final)

## Problem
Explore currently drills World → Country → City → Attraction. The data model, migration,
and editor (tasks 1–3) now support an optional Region in between, and it's populated for
several countries (Germany/Black Forest, Italy/Lake Garda, Iceland's 8 regions, Georgia's
Kazbegi corridor, Israel's geographic areas, USA/US-NY), but Explore itself has no concept
of it yet — selecting a country still goes straight to a flat city list/map, with no way to
see or drill into a region.

## Goal
Explore supports World → Country → Region → City → Attraction, with Region optional and
transparent when unused: a country where no attraction has a region behaves exactly as
today (Country → City, no extra click, no empty region step). A country that mixes regioned
and unregioned cities (e.g. Germany: Black Forest cluster + standalone Berlin/Frankfurt/
Stuttgart) shows both — region groupings and standalone cities — at the country level.

## Requirements
- **Country-level view**: when a selected country has at least one attraction with a
  `region` set, show region groupings (map pins/tiles and/or grid) alongside any standalone
  cities that have no region — both need to be reachable from the same country view
- **Region-level view**: selecting a region drills into its cities (map + grid, mirroring
  today's country-level view but scoped to the region) — same filter/sort/pagination
  affordances the city level already has
- **City-level view**: unchanged — reached either directly (country with no regions) or via
  a region
- **Backward-compatible default**: a country with zero regioned attractions works exactly
  like today, no new step, no empty/dead-end region screen
- **Data layer**: will likely need a new aggregation (mirroring `GET /api/attractions/cities`
  — see `src/app/api/attractions/cities/route.ts` — but grouped by region within a country)
  to power region-level map pins (centroid lat/lng, attraction count, the same
  visited/usedInTrip/verified bucket counts the city aggregation already computes)
- **URL persistence**: extend the existing country/city/filter URL sync
  (`src/app/explore/ExploreClient.utils.ts`, shipped in the "persist Explore state" task) to
  also carry the selected region, so refresh/direct-load restores a region-scoped view too
- **Filters**: the existing category/type/foodStyle/visited/tripUsage/verified filters must
  keep working at every level, including the new region level
- Follow the goal's established region-naming precedent (region groupings are labeled with
  the plain region string already in the data — "Black Forest", "US-NY", "Galilee", etc.)

## Constraints
- Don't change how a country with no regions behaves in any way a user would notice
- Reuse the existing map/grid toggle, pagination, and filter-sidebar patterns already built
  for the city level rather than inventing new ones for the region level — they should feel
  like the same drill-down, one level deeper
- `src/app/explore/ExploreClient.tsx` is already a very large component — the designer/
  developer should watch for opportunities to extract the new region-level view rather than
  further bloating this one file (judgment call, not a hard requirement)

## Out of scope
- Any change to the Attraction data model, migration, or editor (done in tasks 1–3)
- Assigning regions to any additional countries beyond what was already migrated
- Changing how nested (child) attractions inherit region (already handled server-side)

## Design Brief

**Principle: reuse, don't invent.** This design system (docs/DESIGN_SYSTEM.md) is
minimalist and reuse-first — Region gets no new visual language. It reuses the exact
sidebar-list pattern already built for Country/City (`.cityList` / `.cityListLabel` /
`.cityPill` / `.cityPillCount` / `.backBtn` / `.cityHeading` / `.cityCount` in
`ExploreClient.module.css`), and the exact map-pin treatment already used for city pins
(`ExploreMapWidget`'s `onCityClick`, styled identically to today's city pins — no new pin
color/shape/size). One level deeper, same look.

### State model
Add one new view level between `"country"` and `"city"` in the existing
`view = selectedCity ? "city" : selectedCountry ? "country" : "world"` derivation
(ExploreClient.tsx ~line 871): introduce `selectedRegion` state, and make `view` a 5-way
derivation — `"city"` (selectedCity set) → `"region"` (selectedRegion set, no city) →
`"country"` (selectedCountry set, no region/city) → `"world"`. A country with zero regioned
attractions never has anything to select at the region level, so `view` skips straight from
`"country"` to `"city"` exactly as today — no code branch needs to "know" a country has no
regions, it simply never offers a region to select.

### Country view (sidebar)
Currently one `.cityList` section labeled "Cities". When the selected country has at least
one region, render **two** labeled sections instead, in this order:
1. `.cityListLabel` "Regions" → one `.cityPill` per region (label = the region string
   itself, e.g. "Black Forest", "US-NY", "Galilee" — no translation/prettifying), count
   badge = attraction count in that region (respecting active filters, same `countFor`
   logic as city pills use today)
2. `.cityListLabel` "Cities" → the existing city pill list, but scoped to only cities that
   have **no** region (a region's own cities do not also appear flat here — they're reached
   by drilling into the region first)

When the country has zero regioned attractions, this is unchanged from today — a single
"Cities" section, no "Regions" section rendered at all (not even empty).

Update the `{citiesInCountry.length} cit{...}` count line above the list to also mention
region count when regions exist, e.g. "3 regions · 5 cities" — reuse `.cityCount`, no new
class.

### Region view (new — mirrors country view exactly)
- `.backBtn` — "‹ {selectedCountry}" — goes back to country view (`handleBackToRegion`'s
  inverse: clears `selectedRegion`, keeps `selectedCountry`)
- `.cityHeading` — the region name
- `.cityCount` — city/attraction counts, same pattern as country view
- `.cityList` — cities within this region only (no "Regions" sub-level — regions don't
  nest)
- Map: same `ExploreMapWidget`, flown/scoped to the region's cities only (mirrors how
  country view scopes the map to that country's cities today)

### City view
No visible change. Its `.backBtn` label/target becomes context-dependent: if reached via a
region, back goes to that region (not the country); if reached directly (unregioned city),
back goes to the country, unchanged from today.

### Map pins
`ExploreMapWidget` gets one more click handler, `onRegionClick`, wired exactly like
`onCountryClick`/`onCityClick` are today (see ExploreClient.tsx ~1494). Region pins render
in the country-level map view alongside standalone city pins (both visible together, same
visual treatment — a pin doesn't announce whether it's a region or a city; the sidebar list
section header is what communicates that). Selecting a region flies the map to that
region's bounds, same `flyToCity`-style behavior, scoped to the region's city cluster.

### URL persistence
`ExploreClient.utils.ts`'s `ExploreUrlState`/`parseExploreUrlState`/
`buildExploreSearchParams` (shipped in the earlier "persist Explore state" task) gains one
more field: `region: string | null`, synced exactly like `city` is today (param name
`region`, omitted when unset). A URL with `?country=Germany&region=Black+Forest` restores
straight into region view on load — the existing "country persists → then optionally
city persists" logic just gains one more link in the chain (region between country and
city, only meaningful if city isn't also set... actually city implies its region/country
context is still needed for the back-button chain, so restoring `?country=X&region=Y&city=Z`
should restore full city view with the correct back-button target).

### Data layer
New minimal aggregation, mirroring `GET /api/attractions/cities`
(`src/app/api/attractions/cities/route.ts`) but grouped by `{ country, region }` instead of
`{ country, city }`, returning the same shape (name → region string, country, centroid
lat/lng, count, visited/usedInTrip/verified buckets) so the exact same `combinedCount`/
`countFor`/bucket-filtering logic in ExploreClient.tsx works unmodified on region entries —
literally the same functions, called on a region-shaped list instead of a city-shaped one.
Simplest implementation: one new route `GET /api/attractions/regions` copying the cities
route's aggregation pipeline with `region` swapped in for `city` in the `$group` stage
(skip documents where `region` doesn't exist, mirroring how city's `$match` requires
`city` to exist).

### Accessibility / interaction (from the design-system checklist, scoped to this being a
web app, not the mobile-specific parts of the loaded design skill)
- Region pills are real `<button>`s (already the pattern), keyboard-reachable, with visible
  focus state inherited from `.cityPill`'s existing focus styling
- Back-button chain must always be accurate — going back never lands somewhere the user
  didn't come from (province of the existing `handleBackToX` functions, just one more link)
- No animation needed beyond whatever transition city/country selection already has today
  (state-driven re-render, no bespoke transition to design)

## Implementation Notes
- Files created/modified:
  - src/app/api/attractions/cities/route.ts (added `region: { $first: "$region" }` to the `$group` stage and to `$project`, so each city entry now carries its region)
  - src/app/explore/ExploreClient.tsx (CityEntry gains `region?`; new `RegionEntry` type; `selectedRegion` state incl. URL-init; `regionsInCountry`/`unregionedCitiesInCountry`/`citiesInRegion`/`filteredRegionAttractions` derived client-side — same pattern `countries` already used to derive itself from `visibleCities`; 5-way `view` derivation gains `"region"`; new `handleRegionSelect`/`handleBackFromRegion` handlers, `handleBackToCountry` renamed/split into `handleBackFromCity` (region-or-country aware) since the back-button target now depends on how the city was reached; sidebar gains a Region view block plus Regions/Cities section split in the Country view; all `view === "country" || view === "city"` guards (measure panel, footer, map/grid toggle) widened to include `"region"`; `MapHandle` gains `flyToRegion`)
  - src/app/explore/ExploreMapWidget.tsx (props gain `regions`/`selectedRegion`/`onRegionClick`; `CityPinsLayer` made generic (`<T extends MapPinEntry>`) so it renders both city and region pins with the same clustering code; new region circle-fallback boundary (same amber style as country's); `showCityPins`/attraction-pin visibility conditions widened to the region view; country-level pin rendering now renders two independent `CityPinsLayer`s side by side — regions and standalone unregioned cities — per the Design Brief's "both visible together, no visual distinction between pin types" requirement)
  - docs/LEARNINGS.md (2 new bullets: the "derive the new level client-side from existing aggregation data" pattern, and the generic `CityPinsLayer` pattern)
- Deviations from Design Brief: none. One thing flagged but NOT fixed (pre-existing, unrelated to this task): selecting a country/region/city while `viewMode === "grid"` (the default) doesn't fly the map, because `ExploreMapWidget`/the Leaflet instance is unmounted in grid view (`mapRef.current` is null) — confirmed via screenshot testing that this affects a plain country selection today too (tested France, no regions involved), not something this task introduced or worsened. Left out of scope since fixing it means changing the map's mount lifecycle, unrelated to the region feature itself.
- New design tokens used: none — reused `.cityList`/`.cityListLabel`/`.cityPill`/`.cityPillCount`/`.backBtn`/`.cityHeading`/`.cityCount` unchanged, and the exact amber (`#B45309`/`#F59E0B`) circle style already used for the country-level boundary fallback, for the new region-level boundary fallback
- Verification: `tsc --noEmit` clean; `eslint` on all 4 touched files shows exactly +1 over the pre-change baseline (one new instance of an already-existing `initialUrlStateRef`-pattern lint rule, not a new category of issue — confirmed via git-stash diff); live-tested via Playwright screenshots against the real dev server + real migrated DB data: Germany's country view correctly shows "1 region · 13 cities" with Black Forest (494) grouped separately from standalone Berlin/Frankfurt/Karlsruhe/Stuttgart + the 10 flagged towns (all correctly unregioned); region view ("Black Forest", 137 cities, 495 attractions) correctly scopes the city list/grid; a country with zero regions (France) renders byte-for-byte the same as before this task (no Regions section at all); direct URL restore (`?country=Germany&region=Black+Forest`) works; map view shows the region's amber circle boundary + clustered city pins once flown to (verified via a real click-through, not just a direct URL load)

## Completion Summary
Explore now supports an optional Region level (World -> Country -> Region -> City -> Attraction): country view splits into Regions/Cities sections when regions exist, region view mirrors country view, map shows region + city pins together with a circle boundary on drill-in, and URL persistence covers region. Verified live against real migrated data (Germany/Black Forest, France with no regions unchanged). Confirmed by the user 2026-09-06.
