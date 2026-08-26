# Task: Deduplicate map pins for nested (child) attractions, any depth

Status: done
Track: B
Track reason: suppression/grouping logic on top of already-established map pin rendering — no new visual pattern, just filtering which attractions get their own pin.

## Problem
This finishes the previously open `nested-attractions-map-dedup` task from the `nested-attractions` goal (never completed), updated for the fact that nesting is no longer capped at one level (per `nested-attractions-multi-level.md`). Every attraction — including deeply nested children sharing a top-level ancestor's coordinates — currently renders its own separate map pin, stacking multiple pins at effectively the same location.

## Goal
On every map surface in the app that plots individual attraction pins (Explore country/city view, trip nearby-planner, trip day-map view, etc.), only the top-level ancestor of a nested chain gets its own pin; children at any depth are browsable through that ancestor's pin/detail view rather than getting redundant pins of their own.

## Requirements
- Identify every map surface currently plotting attraction pins (grep for existing marker-rendering code across Explore, trip detail's day map view, nearby planner).
- For each, filter the plotted set to attractions with no `parentAttractionId` (top-level only) — a child (at any nesting depth) is excluded from its own pin.
- Ensure the top-level ancestor's pin/popup surfaces a way to reach its nested descendants (e.g. reuse the existing "Contains N places" / drill-down UI from `nested-attractions-detail-display.done.md`) so children remain reachable, just not as separate pins.
- Confirm attraction list/grid/search views (non-map) are unaffected — children still get their own independent card there, per the original confirmed decision ("a child keeps its own independent card everywhere... not hidden inside the parent only").

## Constraints
- This only affects map pin rendering — every other consumer of the attraction list (cards, search, scheduling) keeps showing children as their own independent items, per the existing confirmed product decision.
- Must work for any nesting depth, not just direct children (a grandchild also gets no separate pin, since it shares its top-level ancestor's coordinates).

## Out of scope
- Changing pin clustering logic unrelated to nesting (already handled by `explore-country-view-pin-clustering.done.md`).

## Implementation Notes
- Files created/modified:
  - `src/lib/mapPinDedup.ts` (new) — `filterTopLevelMapPins()`: given a list of attractions, suppresses a child's pin (any nesting depth — anything with a non-null `parentAttractionId`) only when a top-level attraction at the same exact coordinates is also present in the same list; if no top-level sibling is present at that location, the child keeps its own pin so it's never silently dropped from the map.
  - `src/lib/index.ts` — barrel export for `filterTopLevelMapPins`.
  - `src/app/explore/ExploreMapWidget.tsx` — `visibleAttractions` (the country/city view's attraction-pin source) now runs through `filterTopLevelMapPins` after the existing bounds filter.
  - `src/app/trips/[id]/TripExploreMapWidget.tsx` — the trip Explore-tab map's marker list is now `filterTopLevelMapPins(withCoords)`; `BoundsFitter` still receives the full `withCoords` (bounds-fitting is unaffected by which items get their own pin, and a child's identical coordinates wouldn't change the bounds anyway).
- Surfaces audited but intentionally left unchanged: `src/app/trips/[id]/TripDayMapWidget.tsx` already groups every attraction sharing exact coordinates into one `MarkerGroup` (pre-existing logic, unrelated to nesting) — a scheduled parent+child pair already renders as a single stacked marker there, so this task's problem doesn't exist on that surface.
- Descendant drill-through: clicking a surviving top-level pin already opens `AttractionDetailModal`, which already has the "Contains N places" expand/drill-down UI from `nested-attractions-detail-display.done.md` — no additional UI needed to reach suppressed children.
- Deviations from task requirements: none.
- New design tokens used: none.
- Verified: `next build` succeeds.

## Completion Summary
Explore's country/city map and the trip Explore-tab map now suppress a nested attraction's own pin whenever its top-level ancestor is also present at the same coordinates in the same view, at any nesting depth — children remain independently reachable via the ancestor pin's existing "Contains N" drill-down. The trip day map already deduplicated same-coordinate markers via its pre-existing grouping logic. Closed 2026-08-26.
