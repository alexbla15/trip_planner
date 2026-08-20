# Task: Zoom-based city/attraction pin switching on Explore country map

Status: done
Track: A
Track reason: new marker type (square city pins), new zoom-driven view logic — not an existing pattern in ExploreMapWidget or the design system

## Problem
`ExploreMapWidget.tsx` currently has three *selection-driven* (not zoom-driven) view states: `world` (one pin per country), `country`, and `city` — but "country" view renders every individual attraction pin at once with no aggregation (lines ~262-284, one `Marker` per attraction with coordinates). For a country with many attractions this is visually overwhelming. A separate component, `src/components/CitiesMap/CitiesMap.tsx` (used today only in Analytics/Profile, not Explore), already renders one aggregate circle marker per city with a count — but it's not wired into Explore and uses circles, not the requested square markers.

## Goal
When a user selects a country in Explore and is zoomed out, they see one pin per city (square markers, with some indication of attraction count); zooming in past a threshold reveals the individual attraction pins for that area instead.

## Requirements
- Add zoom-level awareness to the country view of `ExploreMapWidget.tsx` (Leaflet exposes zoom via map events/hooks — follow whatever pattern the rest of the codebase's Leaflet usage follows).
- Below a chosen zoom threshold: render one square marker per city (grouping the country's attractions by city/coordinate proximity), positioned at each city's representative location.
- At/above the threshold: render individual attraction pins as today (`makeAttractionMarkerIcon`), unchanged.
- Add a new square city-marker icon factory in `src/lib/mapIcons.tsx` (parallel to existing `makeCountryMarkerIcon`/`makeAttractionMarkerIcon`/`makeCustomPinIcon`) — square shape distinguishes it from the existing circular attraction/country markers.
- Clicking/zooming into a city pin should zoom the map in on that city (revealing its attractions), consistent with the existing city-selection flow already in `ExploreMapWidget.tsx`.
- Decide during implementation whether to reuse `CitiesMap.tsx`'s city-grouping logic (`CityEntry` grouping by lat/lng) or reimplement inline in `ExploreMapWidget.tsx` — reuse if the existing grouping utility isn't tightly coupled to Analytics/Profile-specific data shapes.

## Constraints
- `world` view (country-level pins) and `city` view (fully zoomed into one city) behavior are unchanged — this only affects the intermediate `country` zoom range.
- Keep existing attraction pin rendering/interactions (selection, visited state, measure tool) unchanged once zoomed in past the threshold.

## Out of scope
- Changing the Analytics/Profile `CitiesMap.tsx` component itself (only its grouping logic may optionally be reused).
- Marker clustering libraries/plugins — a simple zoom-threshold city/attraction switch is sufficient, not a full clustering library integration.

## Design Brief

This is a Next.js web app using CSS Modules, Leaflet via `react-leaflet` for maps (no Tailwind, no component library). No new visual tokens are needed — this is a new *marker shape*, not a new color system.

**Ground truth from the current code** (`src/app/explore/ExploreMapWidget.tsx`):
- `view = selectedCity ? "city" : selectedCountry ? "country" : "world"` (line 131) — derived, not stored.
- Attraction pins currently render at line 262: `{(view === "country" || view === "city") && attractions.map(...)}` — one `Marker` per attraction using `makeAttractionMarkerIcon`. This is the block that needs to become conditional on zoom when `view === "country"`.
- No zoom-level state exists anywhere in this codebase yet. The only `useMapEvents` precedent is `MeasureClickWatcher` (lines 22-29) — a component that calls `useMapEvents({...})` and returns `null`, existing purely for its event-handler side effect. Follow this exact shape for the new zoom watcher.
- `cities` prop (from `ExploreClient.tsx`) is the **full, unfiltered, all-countries** `CityEntry[]` list — the widget itself already filters it per-selection elsewhere (see the `cityEntry` memo, lines 123-129, filtering by `c.name === selectedCity && c.country === selectedCountry`). Filter it to the selected country the same way (a new `useMemo` filtering `cities.filter(c => c.country === selectedCountry)`).
- `CityEntry` (defined in `ExploreClient.tsx`, imported by the widget) already has everything needed: `{ name, country, lat, lng, count, visitedCount, unvisitedCount }` — no new grouping/aggregation logic needed, `count` is the per-city attraction count to show on the marker.
- City selection today only happens via a sidebar list click (`ExploreClient.tsx` lines 740-750, `onClick={() => handleCitySelect(c)}`) — there is currently no click-driven city selection *on the map itself*. `handleCitySelect` (line 316) already does everything a map click should trigger: sets `selectedCity`, resets filters. It's the exact function to reuse for the new city-pin click handler — thread it down as a new `onCityClick: (city: CityEntry) => void` prop, wired at the `<ExploreMapWidget>` call site (~line 944) as `onCityClick={handleCitySelect}`. (The widget's own `mapRef.current?.flyToCity(...)` isn't needed on the click itself — `handleCitySelect` already exists precisely to be called from a click and the existing sidebar flow already flies the map via a `useEffect` reacting to `selectedCity`; confirm this during implementation and only add an explicit `flyToCity` call if the sidebar path doesn't already trigger it.)

**New marker: `makeCityMarkerIcon`** (add to `src/lib/mapIcons.tsx`, parallel to the other three factories in the same file):
- Same `L.divIcon` + `renderToStaticMarkup` pattern as `makeCountryMarkerIcon`/`makeAttractionMarkerIcon`/`makeCustomPinIcon` (all in that file) — build an inline-styled `<div>` string, not a React component render.
- **Square** (rounded corners, not circular) — this is the one deliberate visual difference from every existing marker (`border-radius: 6px` instead of `50%`), so a city pin reads as "not an individual place" at a glance.
- Reuse `COUNTRY_MARKER_COLOR` (`#0284C7`, from `src/lib/mapIcons.constants.ts`) as the fill — city pins are conceptually the same "aggregate" tier as country pins, just square instead of circular and one level down; do not invent a new color.
- Icon: a lucide `Building2` (already available via the `lucide-react` import already used in this file for `Globe`/`MapPin`) rendered white, same as the other factories' icon treatment (`size={16}`, `color={MARKER_ICON_WHITE}`).
- Add a small count badge: a white circle in the top-right corner of the square (absolute-positioned within the same inline-HTML string, e.g. `position:absolute; top:-6px; right:-6px; width:18px; height:18px; border-radius:50%; background:#fff; color:${COUNTRY_MARKER_COLOR}; font-size:10px; font-weight:700;` centered text) showing the city's attraction count — same visual weight as a notification badge, not a separate marker.
- New size constant `CITY_MARKER_SIZE_PX` in `mapIcons.constants.ts` (suggest `36`, between `ATTRACTION_MARKER_SIZE_PX=30` and `COUNTRY_MARKER_SIZE_PX=40` — a city pin should read as "bigger than one place, smaller than a whole country").
- `iconAnchor` centered, same as the other three factories.

**Zoom threshold:**
- Add a `ZoomWatcher` component in `ExploreMapWidget.tsx` (same file, same `useMapEvents`-returns-`null` shape as `MeasureClickWatcher`) listening to `zoomend`, lifting the current zoom into a new `useState<number>` in the widget (initial value matching the `MapContainer`'s `zoom={2}` prop).
- Define a named threshold constant (e.g. `CITY_PIN_ZOOM_THRESHOLD = 9`) near the top of `ExploreMapWidget.tsx` — between the country fly-to zoom (5) and the city fly-to zoom (13) from `MapController` (lines 39-41), so zooming out from a selected city naturally crosses back into city-pin view before reaching country-wide zoom.
- New rendering condition for the `view === "country"` block: below the threshold → render one `Marker` per filtered `CityEntry` using `makeCityMarkerIcon`, click → `onCityClick(cityEntry)`, with a `Tooltip` showing the city name + count (same `Tooltip direction="top"` pattern already used on every other marker in this file). At/above the threshold → render the existing per-attraction `Marker` loop, completely unchanged.
- `view === "city"` keeps rendering attraction pins unconditionally regardless of zoom (per the task's constraint — only the `country` view's zoom range is affected).

**Constraints carried over:** `world` view and `city` view visuals/behavior stay exactly as they are today; existing attraction-pin interactions (measure-tool selection border, visited-state border, click → `onAttractionClick`) are untouched once the zoom threshold is crossed into individual-pin territory.

## Implementation Notes
- Files created/modified:
  - `src/lib/mapIcons.constants.ts` — added `CITY_MARKER_SIZE_PX = 36`.
  - `src/lib/mapIcons.tsx` — added `makeCityMarkerIcon(count)`: square (6px border-radius) divIcon, `Building2` lucide icon, `COUNTRY_MARKER_COLOR` fill, white count badge absolute-positioned in the top-right corner.
  - `src/app/explore/ExploreMapWidget.tsx` — added `CITY_PIN_ZOOM_THRESHOLD = 9` constant, `ZoomWatcher` component (`useMapEvents({ zoomend })`, same shape as `MeasureClickWatcher`), `zoom` state, `citiesInSelectedCountry` memo (filters the widget's full `cities` prop by `c.country === selectedCountry`), `showCityPins` derived flag, a new city-pin `Marker` block, and updated the attraction-pin condition from `(view === "country" || view === "city")` to `(view === "city" || (view === "country" && !showCityPins))`. Added `onCityClick` to `ExploreMapWidgetProps`.
  - `src/app/explore/ExploreClient.tsx` — wired `onCityClick={handleCitySelect}` at the `<ExploreMapWidget>` call site; confirmed `handleCitySelect` already calls `mapRef.current?.flyToCity(...)` directly (no separate effect needed), so no additional fly-to wiring was required.
- Deviations from brief: none.
- New design tokens used: none — reused `COUNTRY_MARKER_COLOR`, `MARKER_ICON_WHITE`.
- Verified live via a real browser against the real "Hungary" country (65 attractions across Budapest and Szentendre): at country-selection zoom (5, below threshold), the map showed exactly 2 square pins (one per city) each with a count badge ("55", "6") instead of 65 individual pins; zooming in past the threshold via the map's +/- control revealed 61 individual per-type attraction pins in the current viewport, matching pre-existing behavior exactly. World view and city view were not touched by this change.

## Revision (user feedback before close-out)
- User clarified that zooming in should show only the attractions **within the currently visible map region**, not every attraction in the whole country regardless of pan position — the initial implementation rendered all of `attractions` once zoomed past the threshold, which stayed correct only while centered on the city that was originally flown to.
- `ZoomWatcher` renamed to `ViewportWatcher` and extended to also listen for `moveend` (panning), lifting both zoom and `map.getBounds()` into state. Added a `visibleAttractions` memo that filters `attractions` to those whose coordinates fall within the current bounds (`bounds.contains(...)`), used in place of the raw `attractions` prop for the individual-pin render. Falls back to the unfiltered list before the first `zoomend`/`moveend` fires (bounds still `null`).
- Verified live: after zooming in on Budapest then panning the map away, the marker count dropped (61 → 55 in the test pan) as attractions left the visible bounds — confirmed visually via screenshot that only in-view pins remain.

## Revision 2 (user feedback: threshold still too low)
User reported that even a small amount of zoom-in still showed every attraction in the country. Root cause: `CITY_PIN_ZOOM_THRESHOLD` (9) was only just above the country flyTo zoom (5) — for a small country like Hungary, the viewport at zoom 9-11 still spans nearly the entire country, so the bounds filter alone couldn't narrow things down (the bounds themselves were still country-sized). Measured empirically: at zoom 9-11 the map showed 61/61 attractions; only by zoom 12 did the viewport genuinely start to narrow.

Raised `CITY_PIN_ZOOM_THRESHOLD` from 9 to 12 — much closer to the city flyTo zoom (13), so individual pins only appear once the viewport has actually narrowed to a region small enough for the bounds filter to be meaningful. Verified live via the realistic flow (clicking a city pin in the sidebar, which flies to zoom 13 centered on that city): now shows 54 of Budapest's 59 attractions, correctly scoped to the visible region. Noted for the record: zooming in via the +/- control *without* panning toward a city can still briefly show most/all of a small country's attractions right at the threshold crossing (since the viewport is still centered on the country's geometric center, not any specific city) — this matches standard map-app behavior (Google Maps etc. behave the same way) and isn't something to special-case.

## Completion Summary
Explore's country-view map now shows one square, count-badged pin per city when zoomed out, switching to individual attraction pins — scoped to the currently visible map region, not the whole country — once genuinely zoomed in on an area. Went through two rounds of user-driven correction (viewport-bounds filtering, then a higher zoom threshold) before landing correctly. Confirmed by the user and closed 2026-08-20.
