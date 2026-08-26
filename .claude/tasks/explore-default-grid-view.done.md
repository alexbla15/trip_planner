# Task: Default Explore to grid view

Status: done
Track: B
Track reason: flips an existing toggle's default state, no new UI or design decision (grid view itself already shipped in `explore-grid-view.done.md`).

## Problem
`/explore` country/city view defaults to map view with an optional grid toggle (added in `explore-grid-view.done.md`). Users who prefer scanning a list/grid have to manually switch every time.

## Goal
`/explore` country/city view opens in grid view by default; the existing map/grid toggle still lets the user switch to map, but the initial `viewMode` state is `"grid"` instead of `"map"`.

## Requirements
- Change the initial state of the map/grid toggle in `ExploreClient.tsx` to grid.
- All existing behavior of the toggle (filters, pagination, click-through to `AttractionDetailModal`) stays unchanged — this is a default-value change only.
- World view (country picker) is unaffected — it has no grid mode, per the original task's scope.

## Constraints
- Do not change the toggle's mechanics, only its default value.

## Out of scope
- Persisting the user's last-chosen view mode across sessions.
- Any change to grid/map view behavior itself.

## Implementation Notes
- Files created/modified: `src/app/explore/ExploreClient.tsx` — changed `useState<"map" | "grid">("map")` to `useState<"map" | "grid">("grid")` for `viewMode`.
- Deviations from task requirements: none. World view still forces the map (`viewMode === "map" || view === "world"` at the render gate), unaffected by this default change, as required.
- New design tokens used: none.

## Completion Summary
Explore now opens in grid view by default for country/city view; world view is unaffected (always map). Closed 2026-08-26.
