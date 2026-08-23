# Task: Grid view for /explore (map view alternative)

Status: done
Track: A
Track reason: new UI surface (attraction grid card, pagination, view-mode toggle) with no existing design-system precedent for a grid-of-attraction-cards layout.

## Problem
The `/explore` page's country/city view only offers a map of pins. A user who wants to quickly scan/compare many attractions at once (rather than clicking pins one at a time) has no list/grid alternative — `AttractionSearchModal`'s list is the closest precedent but lives in a different, modal context.

## Goal
Within country/city view on `/explore`, the user can toggle between the existing map view (default) and a new paginated grid view that shows every attraction currently matching the active filters (category/type/visited — the same filters already driving the map's pins), with visited and "used in one of my trips" indicators, and click-to-open the full attraction detail card.

## Requirements
- A map/grid toggle control, visible whenever the map currently shows individual attraction pins (country view and city view) — not at world view, which has no individual-attraction list loaded.
- Grid view renders from the exact same filtered attraction array the map already computes (`filteredCountryAttractions` / `filteredAttractions` in `ExploreClient.tsx`) — no new fetch, no separate filter logic.
- Paginated (client-side, matching the app's existing pagination UI pattern used elsewhere, e.g. `NearbyAttractionsModal`).
- Each grid card: photo (or fallback), name, city, primary type — clicking opens the existing `AttractionDetailModal` (same modal the map's pin click already opens).
- Each card indicates (icon-only, no extra copy needed):
  - Visited (`isVisited`)
  - Already used in one of the user's own trips (`usedInTripNames.length > 0`) — do NOT name which trip(s) in this view (that's the detail card's job).
- Toggle state does not need to persist across navigation/reload — resets to map view on each page load.

## Constraints
- Reuse `AttractionDetailModal` as-is for the click-through — no new detail surface.
- Grid must respect the map area's existing Leaflet z-index containment (`.mapArea` uses `isolation: isolate`) — don't reintroduce a stacking bug when swapping map↔grid in the same container.

## Out of scope
- A grid/list view for world view (country picker) — stays map/list-of-countries only, as today.
- Grid view for the measure-distance tool — that stays map-only.

## Design Brief
- Toggle: a small segmented Map/Grid control floating top-right over `.mapArea`, only rendered in country/city view. `.mapArea` already contains Leaflet to `z-index: -1` via `isolation: isolate`, so the plain HTML toggle needs no explicit z-index to sit above the map.
- Grid: `repeat(auto-fill, minmax(180px, 1fr))` responsive grid, 16px gap, cards use a 4:3 photo area (or a centered type icon when no photo — mirrors the existing photo/no-photo fallback pattern in `AttractionDetailModal`/`TripDetailClient`'s attraction rows).
- Indicators: small circular badges in the photo area's top-right corner — green Check (visited) stacked above blue Luggage (used in trip), icon-only per the requirement not to name which trip in this view.
- Pagination: same visual pattern already used in `NearbyAttractionsModal` (centered prev/page-label/next).

## Implementation Notes
- Files created/modified:
  - `src/components/AttractionGridCard/` (new) — `AttractionGridCard.tsx`/`.module.css`/`.types.ts`/`index.ts`, added to `src/components/index.ts`.
  - `src/config/ui.ts` — new `EXPLORE_GRID_PAGE_SIZE = 12`.
  - `src/app/explore/ExploreClient.tsx` — `viewMode`/`gridPage` state, `gridAttractions`/pagination derived from the same `filteredAttractions`/`filteredCountryAttractions` the map already uses, toggle control + conditional map/grid render inside `.mapArea`, page-reset effect on scope/filter change.
  - `src/app/explore/ExploreClient.module.css` — toggle, grid, and pagination styles.
- Deviations from brief: none.
- New design tokens used: none — reused `--color-success`/`--color-primary` (badges), existing radius/shadow/spacing tokens.
- Verified live: toggle absent at world view, present at country/city view; grid renders 12/page with correct total-page count; card click opens `AttractionDetailModal`; visited attraction shows green check badge, an attraction added to a trip shows blue luggage badge (confirmed on two different real attractions via screenshots, cleaned up after).


## Completion Summary
Grid view for /explore shipped and evolved through several follow-up rounds: dynamic page sizing (measured columns x fixed rows, replacing the original flat page-size constant, with position-preserving pagination across browser zoom/resize), attraction type icons in the card body, black-bordered badges, more prominent (bold/colored) city labels to distinguish same-named chain locations, and a backend pagination-stability fix (secondary _id sort key) for attractions sharing an identical name. Confirmed by the user 2026-08-22.
