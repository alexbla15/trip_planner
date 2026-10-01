Status: done
Track: B

## Completion Summary
Confirmed by user 2026-10-01.

## Request
Follow-up on the sidebar-scroll fix: (1) the "Add Attraction" button now
scrolls into the middle of the countries list instead of staying pinned at
the bottom (regression from that fix), and (2) no type sub-chips (Bar/Café/
Restaurant/...) show under a selected category at world view — user
confirmed (via AskUserQuestion) they want type filtering at world view too.

## Problem 1 — footer regression
The previous fix made `.sidebar` itself the single scroll container so
filter toggles that grow tall wouldn't get clipped. But `.sidebarFooter`
(Add Attraction / Measure distance, explicitly commented "pinned at the
bottom outside scroll") is a sibling of the header/scroll-area content
within `.sidebar` — making the whole sidebar scroll made the footer scroll
away with everything else instead of staying pinned.

## Fix 1
Wrapped `.sidebarHeader` + `.sidebarScrollArea` in a new `.sidebarScrollWrapper`
div (`src/app/explore/ExploreClient.tsx`) that is the actual scroll container
(`flex:1; overflow-y:auto`), while `.sidebar` goes back to `overflow:hidden`
and `.sidebarFooter` stays a separate sibling after the wrapper — pinned
again, while the header+list above it still scroll together as before.

## Feature 2 — world-view type sub-filter
`src/app/api/attractions/cities/route.ts`: added an optional `type` query
param (comma-separated type names, resolved directly via `AttractionType`
since names are globally unique) alongside the existing `category` param —
both apply as separate `$match` stages (ANDed), matching the existing
client-side `passCategory && passType` semantics used once a country is
picked.
`src/services/attractions.service.ts`: `getCities` gained a `types?:
string[]` param.
`src/app/explore/ExploreClient.tsx`: new `worldViewTypes` memo (global
`types` list narrowed by selected categories, world-view equivalent of
`availableTypes` minus the "already loaded" check); the cities-fetch effect
now also sends `selectedTypes` (world view only); the `AttractionFilter`
block uses `worldViewTypes` instead of `[]` at world view.

## Implementation Notes
- `tsc --noEmit`: clean.
- Verified live via Playwright:
  - Footer: with Category & type expanded + Dining selected (tall content),
    confirmed "Add Attraction"'s bounding box is identical before and after
    scrolling the panel 400px (stayed pinned).
  - World-view types: selecting "Dining" at world view revealed 6 type
    chips (Bar/Café/Food Truck/Ice Cream/Restaurant/Supermarket); selecting
    "Bar" hit `GET /api/attractions/cities?category=Dining&type=Bar` and
    narrowed the country list further (26 -> 22).
