# Task: Custom Pin + Travel-Time Tool on Explore

Status: reviewing

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

## Design Brief

### Precedent to copy exactly — `TripDayMapWidget.tsx`'s leg panel
That component already has the complete visual language for "a route between two points, with a mode switch and duration," proven and shipped:
- **Polyline styling** (`TripDayMapWidget.tsx` ~line 548-551): color-coded by mode — walk `#0EA5E9` (sky), car `#F59E0B` (amber), transit `#8B5CF6` (violet) — `weight: 4, opacity: 0.9` once resolved, `weight: 2, opacity: 0.45, dashArray: "6 4"` while the straight-line placeholder is showing (route not yet fetched).
- **Mode toggle** (`.modeGroup`/`.modeBtn`/`.modeBtnActive`, ~line 600-619): a 3-button icon-only group — `Footprints` (walk), `Car` (drive), `Bus` (transit) — `aria-pressed` + `aria-label` per button, grouped with `role="group"`.
- **Leg row** (`.legRow`/`.legHeader`/`.legName`/`.legRight`/`.legTime`, ~line 595-626): "A → B" name row, mode toggle, and duration (or a spinner while `isLoading`, or "—" if unresolved) on the same row.
- **Step breakdown** (`.stepList`/`.stepItem`, ~line 628-646): per-leg icon + optional route-number badge + label + duration — reuse for transit steps if the route has any (matches how `TripDayMapWidget` already shows e.g. bus line numbers).
Copy this whole visual system verbatim for the two-point tool below — same colors, same component structure, same `RouteLeg`/`fetchRouteLeg` data shape (`src/services/routeTransit.service.ts`) — this task is "the same UI, a different pair of points," not a new design.

### Entry point
- New sidebar footer button, "Measure distance" (icon: `Ruler` from `lucide-react`, not yet used elsewhere in this app — matches the semantic icon-mapping convention), placed in `ExploreClient.tsx`'s `.sidebarFooter` (currently rendered `view === "city"` only, per the existing "Add attraction" button) — extend its visibility condition to `view === "country" || view === "city"`, since the tool only requires a country to be selected, per the task's own requirement.
- Clicking it enters "measure mode": the sidebar swaps to a small measure-mode panel (reusing `.legRow`-style layout once 2 points are picked), and the map cursor/interaction changes so that clicking empty map area drops/moves the custom pin, while clicking an attraction marker selects it as an endpoint instead of opening `AttractionDetailModal`.

### Interaction — selecting two points
- State: up to 2 "endpoints," each either `{ kind: "attraction", attraction: Attraction }` or `{ kind: "custom", lat, lng }`.
- Clicking an attraction pin while in measure mode: toggles it into/out of the endpoint list (selected attractions get a distinct highlight — reuse the existing marker-icon convention, e.g. a colored ring or the same "active" treatment used for `activeStat`-style selected states elsewhere, developer's call on exact visual — nothing needs inventing here beyond a selected-state variant of the existing attraction marker).
- Clicking empty map area while in measure mode: drops/replaces a single custom pin (a new marker icon — simple circular pin, e.g. `MapPin` in a filled circle matching the existing `makeCityMarkerIcon()`/`makeCountryMarkerIcon()` icon-factory pattern in `src/lib/mapIcons.tsx` — add a `makeCustomPinIcon()` alongside them).
- Once 2 endpoints are selected (any combination — two attractions, one attraction + the custom pin, or the custom pin used as both... no, a single custom pin can't be both endpoints; if only the custom pin exists, the user still needs a second point from an attraction or a second map click elsewhere to relocate/add-to it — clarify during implementation that a single dropped pin is one endpoint, not two): draw the route (per mode) between them and show the leg-row panel with duration, exactly as described above.
- Selecting a third point (another attraction click, or another empty-map click) while 2 are already set: replaces the **first**-selected endpoint (FIFO), so the tool stays ready for the next comparison without an extra "clear" step in between.
- A visible "Exit" / "Done measuring" action (X icon, matching existing close-button conventions) clears all endpoints and custom pins and returns to normal Explore browsing (attraction clicks reopen the detail modal again).

### Constraints re-confirmed during design
- `fetchRouteLeg(from, to, mode)` (`src/services/routeTransit.service.ts`) takes plain `{lat, lng}` coordinates for both ends — confirmed generic, works identically whether an endpoint is an existing attraction's `coordinates` or an ad-hoc dropped pin's clicked lat/lng. No backend change needed, confirming the task's own constraint.
- Custom pins are local component state only (per Out of Scope) — cleared on exiting measure mode or navigating away from Explore.

### Accessibility
- Mode toggle buttons: same `aria-pressed`/`aria-label` pattern as `TripDayMapWidget.tsx` — nothing new to design.
- Entering/exiting measure mode should be announced (e.g. `aria-live="polite"` region reporting "Measure mode on — click the map or an attraction to pick two points" / "Measure mode off"), since it changes what a map click does — a screen-reader user needs to know the mode changed, not just sighted users inferring it from a toggled button state.

## Implementation Notes
- Files modified: `src/lib/mapIcons.tsx` (`makeCustomPinIcon()`; `makeAttractionMarkerIcon` gained an optional `selected` param for the accent-ring highlight), `src/app/explore/ExploreClient.tsx` (`MeasurePoint` type + helpers, measure state, route-fetch effect via `fetchRouteLeg`, handlers, sidebar entry button + leg-row panel), `src/app/explore/ExploreClient.module.css` (`.measurePanel`/`.legRow`/`.modeGroup`/etc., copied verbatim from `TripDayMapWidget.module.css`'s values), `src/app/explore/ExploreMapWidget.tsx` (`MeasureClickWatcher` — same `useMapEvents` pattern as the existing `ZoomWatcher` — custom pin markers, selected-attraction highlight, route polyline)
- Deviations from brief: none
- New design tokens used: none — every color/spacing value is copied from the existing `TripDayMapWidget` leg-panel system or existing design tokens, per the brief's explicit instruction to reuse rather than redesign
- Entry point extended to the sidebar footer for both `country` and `city` views (per the task's "must select country at least" requirement) — the existing "Add attraction"/"Clear filters" buttons stay city-view-only (unchanged), the new "Measure distance" toggle is the only footer control shown in country view.
- Endpoint replacement is FIFO as specified: a 3rd selection (map click or attraction click) while 2 points are already set replaces the oldest, keeping the tool immediately ready for the next comparison.
- **Verified live, not just reasoned about:** confirmed via direct `curl` that `GET /api/route/valhalla` and `GET /api/route/transit` both return real routing data for two arbitrary Tbilisi-area coordinates with no attraction/trip IDs involved — confirming the brief's assumption that zero backend changes were needed held up in practice.
- `tsc --noEmit` clean. `eslint` shows one new finding consistent with the same `react-hooks/set-state-in-effect` pattern already present (unfixed) throughout this codebase and flagged as pre-existing, accepted debt in every prior task this session (e.g. the identical shape already exists in this same file's city-loading effect, and in `ExploreMapWidget.tsx`'s existing boundary effects) — not treated as a new class of problem, consistent with how every other instance of this pattern has been handled this session.
