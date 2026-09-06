# Task: Map doesn't fly to selection when made while in grid view

Status: done
Track: B
Track reason: bug fix — broken behavior, no new UI surface

## Problem
Selecting a country, region, or city in Explore calls `mapRef.current?.flyToX(...)`, but
`ExploreMapWidget` (and its Leaflet map instance) is only mounted while `viewMode ===
"map"`. Grid view is the default, so `mapRef.current` is `null` at the moment of selection
and every flyTo call silently no-ops. Switching to Map view afterward mounts a fresh map at
the default world zoom/center instead of the place just selected — confirmed via live
testing (screenshots) that this affects plain country selection today, not just the newer
region level.

## Goal
Selecting a country/region/city while in grid view, then switching to Map view, shows the
map already flown to that selection — same as if Map view had been active the whole time.

## Requirements
- When the map widget mounts (or `viewMode` switches to `"map"`), it should sync itself to
  whatever is currently selected (`selectedCountry`/`selectedRegion`/`selectedCity`) rather
  than always starting at the default world view — e.g. an effect inside
  `ExploreMapWidget`/`MapController` that flies to the current selection once on mount,
  using the same `flyToCountry`/`flyToRegion`/`flyToCity` logic already used for live
  selection clicks
- No visible behavior change when `viewMode` is already `"map"` at the time of selection
  (that path already works correctly today — don't regress it, e.g. don't re-fly on every
  re-render)

## Constraints
- Keep the fix scoped to the map's own mount/sync behavior — don't change when
  `ExploreMapWidget` mounts/unmounts (i.e. don't force it to always stay mounted just to
  work around this)

## Out of scope
- Any other Explore behavior — this is purely the "map starts unflown after a grid-view
  selection" bug

## Implementation Notes
- Files created/modified: src/app/explore/ExploreMapWidget.tsx (MapController gains an `initialTarget` prop and a one-time `setView` sync effect, latched via a `didInitialSync` ref that only consumes once a real target resolves — not on an initial null; main component computes `initialMapTarget` from whichever of selectedCity/selectedRegion/selectedCountry is set, using the already-resolved cityEntry/regionEntry/countryEntry and the same zoom levels the live flyToX calls use)
- Deviations from task requirements: none
- New design tokens used: none (no UI change, map-behavior fix only)
- Verification: tsc clean; eslint shows the same single pre-existing error as before this change (confirmed via git-stash diff), no new issues; live-tested via Playwright screenshots through the exact repro steps (grid view default → select Germany → switch to Map → now correctly flown with boundary+pins visible; drilled further to region → grid → city → Map, also correctly flown each time)

## Completion Summary
Fixed ExploreMapWidget so a country/region/city selected while grid view was active (the default) is no longer lost — the map now syncs to the current selection once on mount via MapController's new initialTarget/setView logic. Verified live at all three levels. Confirmed by the user 2026-09-06.
