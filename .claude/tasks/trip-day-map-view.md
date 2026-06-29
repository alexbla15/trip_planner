# Task: Trip Day Map View with Transit Times

Status: reviewing

Track: A
Track reason: new UI surface — Leaflet map panel with custom typed markers, polyline routing overlay, and parallel-attraction conflict picker; no existing pattern

## Problem
Travelers can see their day's attractions as a list or timeline, but have no way to visualize where those attractions are on a map or how long it will take to travel between them in sequence. When two attractions are scheduled at the same time, there is no clear way to decide which route to show.

## Goal
A per-day map view inside (or alongside) the CalendarSection that plots all scheduled attractions for the selected day, draws a routing polyline between them in time order, shows estimated transit times on each leg, and lets the user resolve parallel-time conflicts by choosing which attraction to include in the route.

## Requirements

### Map component
- Use Leaflet + react-leaflet (already installed; follow `next/dynamic({ ssr: false })` pattern from LeafletMapWidget)
- Show one day at a time; a day selector (tabs or a compact dropdown) switches between trip days
- Only days that have at least one scheduled attraction with coordinates are shown in the selector
- Attractions without coordinates are listed below the map as "No location available" and excluded from routing

### Markers
- Each scheduled attraction gets a custom `DivIcon` marker styled by attraction type, using the same `typeColor()` palette already in CalendarSection
- Marker shows a small type icon (same Lucide icon as the timeline block) on a colored circle
- Marker tooltip (on hover) shows: attraction name + planned time

### Routing polyline
- Connect markers in time order (ascending `plannedTime`)
- Draw a simple straight-line `Polyline` (no external routing API) between consecutive stops
- On each polyline segment, show an estimated transit label: `~X min walk` using the Haversine formula at 4 km/h walking speed
- Round to nearest minute; show "< 1 min" for very short distances

### Parallel-time conflict picker
- When two or more attractions share overlapping planned times, they cannot both be in the route order at once
- Show a small compact UI above (or overlaid on) the map: "Conflict on [Day Label] — choose route order:" with the conflicting attraction names as selectable options (radio or toggle chips)
- The selected set determines which attraction is used in the polyline routing for that time slot; the other is still pinned on the map but its leg is drawn as a dashed line

### Layout
- The map panel appears as a new section or tab inside the existing CalendarSection card — below the day-columns grid and above nothing (it replaces the need to scroll as far)
- Alternatively render it as a collapsible panel toggled by a "Map View" button in the CalendarSection header
- Height: fixed ~360px for the map container on desktop; 240px on mobile (so the map doesn't dominate)

### Non-functional
- SSR-safe: dynamic import with `ssr: false`
- Map tiles: OpenStreetMap (same as existing LeafletMapWidget)
- No new npm packages beyond what's installed (`leaflet`, `react-leaflet`)
- Responsive: map reflows within the card's responsive container

## Constraints
- CSS Modules only
- Use `@/config/ui` for any new tuneable constants (assumed constants-configuration task completes first)
- Transit time is explicitly labelled as estimated/walking; no routing API
- If a day has zero attractions with coordinates, show a placeholder ("No mapped attractions for this day")

## Out of scope
- Driving/cycling time estimates (walking only for now)
- Routing via external API (OSRM, Google Directions, etc.)
- Drag-to-reorder attractions on the map
- Real-time traffic or transit data

## Implementation Notes
- Files created: `src/app/trips/[id]/TripDayMapWidget.tsx`, `src/app/trips/[id]/TripDayMapWidget.module.css`
- Files modified: `src/app/trips/[id]/CalendarSection.tsx`, `src/app/trips/[id]/CalendarSection.module.css`
- Deviations from brief: none — all specs implemented as described. Note: `renderToStaticMarkup` from `react-dom/server` is used for icon serialization inside the `ssr: false` dynamic component; if this causes a build error, fall back to a plain numbered circle (remove the `renderToStaticMarkup` call and `iconSvg` string, relying on the order badge alone for route identification).
- New design tokens used: none
