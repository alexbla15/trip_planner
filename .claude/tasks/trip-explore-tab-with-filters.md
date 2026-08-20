# Task: Trip Explore tab — map view of a trip's attractions with filters

Status: intake
Track: A
Track reason: new tab, new map surface embedded in trip detail, no existing pattern for this combination

## Problem
`trips/[id]` currently has Overview / Attractions / Flights / Residences tabs. There's no way to see a trip's attractions laid out on a map, or to filter that view by date(s), type, or category — a user planning or reviewing a trip has to work from the flat attraction list or the calendar grid, with no spatial view scoped to just this trip.

## Goal
A new "Explore" tab on `trips/[id]` shows the trip's own attractions on a map, filterable by date(s) scheduled, attraction type, and category.

## Requirements
- Add a 5th tab to `TripTabBar`/`TRIP_TABS` (`src/app/trips/[id]/TripDetailClient.tsx`) — "Explore" (or similar), alongside Overview/Attractions/Flights/Residences.
- Render a Leaflet map (follow the existing `react-leaflet` patterns already used in `ExploreMapWidget.tsx` and `TripDayMapWidget.tsx`) showing pins for the trip's attractions that have `coordinates`.
- Filtering:
  - **Date(s)**: filter to attractions scheduled on a chosen date or date range (`plannedDate`) — decide during implementation whether this is a single date picker, a range, or multi-select of the trip's actual days.
  - **Type / Category**: reuse the existing shared `AttractionFilter` component (`src/components/AttractionFilter`) — it already supports multi-select category + type chips, collapsible, and is used elsewhere in this app; don't build a new filter UI from scratch.
- Unscheduled attractions (no `plannedDate`) should still be visible/filterable somehow — decide how they interact with a date filter (e.g. always shown, or a separate "no date" toggle) during implementation.

## Constraints
- This is scoped to the current trip's own attractions only (via the trip's existing `attractions` data, not global Explore search) — this is not a replacement for or duplicate of the global `/explore` page.
- Reuse existing map/pin patterns (icon factories in `src/lib/mapIcons.tsx`, `TripDayMapWidget.tsx`'s per-trip map conventions) rather than inventing new ones.

## Out of scope
- The "Plan"/nearby-suggestion feature — that's a separate task ([[trip-nearby-attraction-planner]]) that builds on this tab's map + filter UI.
- Changing the global `/explore` page.
