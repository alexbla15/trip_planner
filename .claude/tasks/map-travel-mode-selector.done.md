# Task: Per-Leg Travel Mode Selector on Day Map

Status: done

Track: A
Track reason: new interactive UI pattern — per-leg travel mode toggle (walk / car / transit) with updated transit time calculation; no existing pattern in design system

## Problem
The day map currently shows estimated walking time between every pair of consecutive attractions. In practice, travelers mix modes — they might walk between nearby spots but drive or take public transport for longer legs. There is no way to specify the travel mode per step.

## Goal
Each route leg on the day map shows a mode selector (foot / car / public transport) so the traveler can specify how they'll travel that step, with the transit time label updating to reflect the chosen mode's speed.

## Requirements

### State
- Each route leg is identified by the key `"${fromAttractionId}_${toAttractionId}"` (from and to attraction `_id`)
- A new `legModes` state in `TripDayMapWidget`: `Record<string, "walk" | "car" | "transit">` — default to `"walk"` for all legs
- When the selected day changes, leg modes can persist (they're keyed by attraction IDs, not day)

### Speed estimates (straight-line distance)
| Mode | Speed |
|------|-------|
| Walk (`"walk"`) | 4 km/h |
| Car (`"car"`) | 40 km/h |
| Public transport (`"transit"`) | 20 km/h |

Label format: `~X min walk`, `~X min drive`, `~X min transit` — round to nearest minute; `< 1 min` for very short distances.

### UI — Route legs panel (below the map)

Show a compact panel **below the map container** (but above the unmapped list) that lists each route leg in order:

```
Leg 1: Louvre Museum → Eiffel Tower      [🚶] [🚗] [🚌]   ~12 min walk
Leg 2: Eiffel Tower → Musée d'Orsay     [🚶] [🚗] [🚌]   ~3 min walk
```

Each row contains:
- Leg label: `{fromName} → {toName}` (truncated with ellipsis if long)
- 3 icon-toggle buttons: Walk (`Footprints`), Car (`Car`), Bus/Transit (`Bus`) — Lucide icons
- The selected mode button is highlighted (primary color); others are muted
- Estimated time label, updated reactively when mode changes

The transit label **on the map polyline** also updates to reflect the selected mode.

### Accessibility
- Each mode button: `aria-pressed={isSelected}`, `aria-label="Walk"` / `"Drive"` / `"Public transport"`
- Leg row: readable as `"{from} to {to}, currently: {mode}, estimated {time}"`

### Non-functional
- Mode state is local to the widget (not persisted to DB)
- No new npm packages
- Only `TripDayMapWidget.tsx` and `TripDayMapWidget.module.css` need to change

## Constraints
- CSS Modules only
- DivIcon HTML (for the on-map transit label) must be regenerated when mode changes — the map `key={selectedDay}` remount is NOT triggered; instead, use a dependency on `legModes` when computing the `TransitLabel` content
- Icons: `Footprints`, `Car`, `Bus` from `lucide-react`

## Out of scope
- Persisting travel mode choices to the database
- Routing via an actual directions API (still straight-line)
- Per-leg travel mode on conflict alternate (dashed) legs


## Implementation Notes
- Files modified: `src/app/trips/[id]/TripDayMapWidget.tsx`, `src/app/trips/[id]/TripDayMapWidget.module.css`
- Deviations from brief: none
- New design tokens used: none


## Completion Summary
Per-leg travel mode selector added to TripDayMapWidget. Route legs panel below the map lists each step with Walk/Drive/Transit icon toggles; selected mode updates both the panel time label and the on-map polyline label reactively. Speeds: walk=4 km/h, car=40 km/h, transit=20 km/h. Leg names hidden on mobile. Confirmed by user 2026-06-29.
