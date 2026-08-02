# Task: Custom Pin + Travel-Time Tool on Explore

Status: intake

Track: A
Track reason: Genuinely new map interaction — click-to-place-a-custom-pin, point selection between two markers, and travel-time/route display — none of which exist on Explore today (confirmed: `ExploreMapWidget.tsx` has no map-click handler or synthetic-marker state currently).

## Problem
Explore lets a user browse countries → cities → attractions on a map, but there's no way to ask "how far is it between these two places" or to mark an arbitrary point of interest that isn't already a saved attraction (e.g. a hotel they're considering, a friend's address). The trip-detail day map (`src/app/trips/[id]/TripDayMapWidget.tsx`) already computes real travel time/route geometry by car, walk, and public transit between two points — but that capability only exists inside a specific trip's day view, scoped to that trip's own attractions/residences/flights.

## Goal
From Explore, once a user has at least selected a country, they can drop a custom pin anywhere in view, and separately pick any two points — either existing attraction pins or their own dropped pin(s) — to see the approximate travel time and route between them by car, public transit, or walking, using the same routing capability already proven in the trip day map.

## Requirements
- Require at least a country to be selected before this tool is available (per the request) — not usable from the unscoped world view.
- Let the user click on the map to drop a custom pin at that location. Support at least one custom pin; decide during design whether multiple simultaneous custom pins are useful or whether one at a time (replaced on each new click) is sufficient for the "measure a distance" use case.
- Let the user pick any two points to measure between: two existing attraction pins, one attraction pin + one custom pin, or two custom pins.
- Show the approximate travel time and route line between the two selected points, with a mode switch (car / public transit / walk) — reuse the existing routing service (`fetchRouteLeg(from, to, mode)` in `src/services/routeTransit.service.ts`) and the two existing generic routing endpoints (`GET /api/route/valhalla` for car/walk, `GET /api/route/transit` for transit) exactly as `TripDayMapWidget.tsx` already does — both endpoints are already generic lat/lng-in, no trip/attraction coupling, so no backend changes should be needed for the routing itself.
- Provide a clear way to exit/reset the tool (clear pins and selection, return to normal Explore browsing).

## Constraints
- Reuse `fetchRouteLeg` and the existing route-drawing/mode-switch UI conventions already established in `TripDayMapWidget.tsx` (polyline rendering, mode toggle, duration display) rather than inventing a new visual language for showing a route.
- No backend/API changes anticipated (both routing endpoints are already fully generic) — confirm this holds once implementation starts; flag if some trip-specific assumption turns out to be baked in after all.
- Custom pins are ephemeral/session-only (not saved to the database as attractions) unless a future task asks for persistence — out of scope here.

## Out of scope
- Persisting custom pins across sessions or associating them with a trip/user account
- Measuring more than two points at once / multi-stop routing
- Any change to the trip-detail day map itself (already works, not being touched)
