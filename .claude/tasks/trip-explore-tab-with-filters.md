# Task: Trip Explore tab — map view of a trip's attractions with filters

Status: done
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

## Design Brief

Next.js web app, CSS Modules, `react-leaflet`. No new visual tokens needed — this reuses existing tab, filter, and map-marker patterns.

**Tab wiring** (`src/app/trips/[id]/TripDetailClient.tsx`):
- `TRIP_TABS` is a `const` array of `{id, label, Icon}` (lines ~76-84):
  ```ts
  const TRIP_TABS = [
    { id: "overview",    label: "Overview",    Icon: LayoutDashboard },
    { id: "attractions", label: "Attractions", Icon: MapPin          },
    { id: "flights",     label: "Flights",     Icon: Plane           },
    { id: "residences",  label: "Residences",  Icon: BedDouble       },
  ] as const;
  ```
  Add a 5th entry: `{ id: "explore", label: "Explore", Icon: Compass }` — `Compass` (lucide-react) matches the icon already used for the global Explore nav link, so the tab reads as "the same kind of view, scoped to this trip." `TripTabId` is derived from this array automatically (`typeof TRIP_TABS[number]["id"]`), so no separate type edit needed.
- Content: add a new `{activeTab === "explore" && (...)}` block alongside the existing overview/attractions/flights/residences blocks, following the exact same structural pattern (each is a self-contained block inside the shared `role="tabpanel"` container).
- `attractions` (full trip attraction list, already loaded in this component's state) is the data source — no new fetch needed. Follow the existing `regularAttractions` derivation (excludes flights/residences/multi-instance duplicates) as the base list for map pins, same as the Attractions tab does.

**Filters — reuse existing patterns, don't invent new ones:**
- Category + type: use `<AttractionFilter>` (`src/components/AttractionFilter`) exactly as `ExploreClient.tsx` already wires it:
  ```tsx
  <AttractionFilter
    hideSearch
    collapsible
    categories={presentCategories}
    selectedCategories={selectedExploreCategories}
    onCategoriesChange={handleExploreCategoriesChange}
    categoryLabel="Categories"
    types={presentTypes}
    selectedTypes={selectedExploreTypes}
    onTypesChange={setSelectedExploreTypes}
    typeLabel="Types"
  />
  ```
  `TripDetailClient.tsx` already computes `presentCategories`/`presentTypes` (categories/types actually present among this trip's attractions) for the Attractions tab's own filter — reuse those exact derivations for the Explore tab too rather than recomputing them a second way. Mirror the existing `handleCategoriesChange` pattern (already present in this file for the Attractions tab) that prunes selected types belonging to a deselected category, applied to the new Explore-scoped selection state.
- Date(s): no date-range-picker component exists anywhere in this codebase — every date filter in this app is plain native `<input type="date">`, and the closest UX precedent for "pick some of this trip's days" is `TripDayMapWidget.tsx`'s day-tab row (lines ~425-437). Follow that precedent: render one chip per day of the trip (from `getTripDays(trip.startDate, trip.endDate)`, already imported/used elsewhere in this file), multi-selectable, plus a distinct "Unscheduled" chip for attractions with no `plannedDate` — default state is **all chips selected** (nothing filtered out) so the tab shows everything on first visit. Do not build a calendar date-range picker; a day-chip row matches this app's existing filter-chip visual language (`AttractionFilter`'s own chips) far more closely.

**Map:**
- `TripDayMapWidget.tsx` is too tightly coupled to single-day routing/conflict logic to reuse or extend — build a new, simpler map component instead (a good candidate for its own file, e.g. `TripExploreMapWidget.tsx` alongside the other trip-scoped map widget, dynamically imported with `ssr: false` the same way `TripDayMapWidget` and the global `ExploreMapWidget` already are).
- Use `<MapContainer>`/`<TileLayer>` boilerplate matching the existing widgets (`fixLeafletDefaultIcon()` call, `"leaflet/dist/leaflet.css"` import).
- Pin styling: use `makeAttractionMarkerIcon(color, iconName, selected?, isVisited?)` from `src/lib/mapIcons.tsx` (the same factory the global Explore map uses) rather than `TripDayMapWidget`'s own local marker builders — this trip-scoped map is conceptually closer to global Explore's per-attraction pins (by category color/icon) than to the day-view's route/waypoint markers. Only render attractions with `coordinates` set.
- Fit the map bounds to the currently-filtered attraction set on filter change (a small, common Leaflet convenience — `map.fitBounds(...)`) so filtering doesn't leave the user staring at an empty pan/zoom state.

**Interaction:** clicking a pin should open the same `AttractionDetailModal` flow already used elsewhere in `TripDetailClient.tsx` (`setViewingAttraction`) rather than inventing a new detail popover.

## Implementation Notes
- Files created/modified:
  - `src/app/trips/[id]/TripExploreMapWidget.tsx` (new) — lightweight map component: `<MapContainer>`/`<TileLayer>` boilerplate matching the other trip-scoped map widget, one `Marker` per attraction with `coordinates` via `makeAttractionMarkerIcon`, a `BoundsFitter` child component (`useMap()` + `fitBounds`/`setView`) that re-fits whenever the filtered attraction id set changes, and an empty-state message when no attractions match.
  - `src/app/trips/[id]/TripExploreMapWidget.module.css` (new) — map container sizing (480px, 320px on mobile) and empty-state styling.
  - `src/app/trips/[id]/TripDetailClient.tsx` — added the 5th `explore` tab (`Compass` icon) to `TRIP_TABS`; a `dynamic(..., {ssr:false})` import of `TripExploreMapWidget` (mirroring `CalendarSection.tsx`'s `TripDayMapWidget` import); new Explore-scoped filter state (`exploreCategories`, `exploreTypes`, `exploreSelectedDays`) kept separate from the Attractions tab's own filter state; `exploreDays`/`activeExploreDays`/`exploreFilteredAttractions` derived values (plain `const`s, not `useMemo`, since they're computed after the existing `if (!trip) return null` early return and adding hooks there would violate hooks-call-order rules); `handleExploreCategoriesChange` mirroring the existing category→type pruning pattern; the new tab's JSX block (day chips + `AttractionFilter` + map).
  - `src/app/trips/[id]/TripDetailClient.module.css` — added `.exploreDayChips`/`.exploreDayChip`/`.exploreDayChipActive`/`.exploreMapWrapper`/`.exploreMapLoading` (reused `.loadingIcon`, already existed).
- Deviations from brief: none on the core design; two small additions requested by the user after initial implementation (see Revision below) weren't in the original brief.
- New design tokens used: none — reused `--color-primary`, `--color-border`, `--color-surface`, `--color-text-secondary`, `--color-text-inverse`, `--radius-full`, `--radius-md`, `--duration-fast`, `--easing-out`.
- Verified live via a real browser against the real "Berlin 2024" trip (9 days, ~44 attractions): Explore tab renders with all 48 (incl. multi-instance) pins on load, deselecting a day chip drops the count correctly (48→46), the map re-fits bounds on filter change, and clicking a pin opens the existing attraction detail modal.

## Revision (user feedback before close-out)
- Added an "All days" chip (dashed border to read as a distinct select-all action, not just another day) that toggles between selecting every day+Unscheduled and clearing the selection entirely — `allExploreDayKeys`/`allExploreDaysActive`/`toggleAllExploreDays` in `TripDetailClient.tsx`.
- Changed `.exploreDayChips` from horizontal-scroll (`overflow-x: auto`) to `flex-wrap: wrap` so a trip with many days doesn't require scrolling to see/reach every day chip.
- Re-verified live: "All days" toggles correctly (fully-active → clears to 0 markers; clicking again from a partial selection re-selects all 48), and the chip row wraps.
