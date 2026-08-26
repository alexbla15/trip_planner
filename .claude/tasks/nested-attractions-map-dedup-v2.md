# Task: Deduplicate map pins for nested (child) attractions, any depth

Status: intake
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
