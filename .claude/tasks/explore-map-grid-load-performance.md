# Task: Improve Explore map/grid loading speed (partial/paginated attraction loading)

Status: intake
Track: B
Track reason: performance/data-fetching change to existing map and grid views — no new visual pattern, both surfaces already exist.

## Problem
`/explore` (map and grid view) appears to load every matching attraction at once before rendering, causing a noticeable wait for the user, especially in countries/cities with many attractions.

## Goal
`/explore` feels fast to open: attractions are loaded incrementally/partially (e.g. paginated or viewport-scoped fetches) instead of blocking on the full result set, for both map and grid view.

## Requirements
- Profile the current fetch path for country/city attraction loading in `ExploreClient.tsx` to confirm where the wait comes from (single large API call vs. rendering cost vs. map marker creation cost).
- Change the attraction fetch to load partially — options to evaluate: server-side pagination matching the grid's existing page size, viewport/bounding-box-scoped queries for the map, or an initial fast batch followed by background loading of the rest.
- Grid view: since it already paginates client-side (`explore-grid-view.done.md`), consider fetching only the attractions needed for the current/next page instead of the full filtered set up front.
- Map view: consider clustering-aware or bounding-box-scoped loading so off-screen/zoomed-out pins aren't all fetched before first render.
- Preserve existing filter behavior (category/type/visited) — partial loading must still respect active filters.
- Measure and report the before/after load time for a heavy country (many attractions) to confirm the improvement.

## Constraints
- Do not break existing filter/pagination correctness for a smaller/lighter perceived win — correctness first, then speed.
- Reuse existing API routes/query params where possible; extend rather than duplicate if new query params are needed for pagination/bounding-box scoping.

## Out of scope
- Changes to World view (country picker) loading — this is about country/city view attraction loading specifically.
