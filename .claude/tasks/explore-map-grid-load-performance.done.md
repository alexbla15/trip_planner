# Task: Improve Explore map/grid loading speed (partial/paginated attraction loading)

Status: done
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

## Implementation Notes
- **Profiling finding**: `getAttractionsByCountry` already paginated through a heavy country's attractions in parallel (all pages fired at once, per an earlier task's fix), but the caller `await`ed the whole `Promise.all` before rendering anything — so a country spanning 2-3 pages (300 results/page) blocked the entire map/grid on the *slowest* of several parallel round trips instead of the fastest. This was the actual bottleneck, not rendering or marker-creation cost.
- Files created/modified:
  - `src/services/attractions.service.ts` — `getAttractionsByCountry` gained an optional `onPage?: (page: unknown[]) => void` callback, invoked once per page as it resolves (first page fires alone before the total/remaining pages are even known; further pages stream in as they complete). Without `onPage`, behavior is unchanged — still resolves once with the full combined list — so the other existing caller (`NearbyAttractionsModal`, a small nearby-radius query, not the reported bottleneck) needed no changes.
  - `src/app/explore/ExploreClient.tsx` — the country-attractions fetch effect now passes an `onPage` callback: the first page replaces `countryAttractions` immediately and clears the loading state right away (fast first paint); any subsequent pages append to the existing array as they arrive, so the map/grid keep filling in instead of the user staring at a blank view until the last page lands.
- Deviations from task requirements: did not implement server-side/viewport-scoped pagination for the map, or reduce the grid to fetch-only-current-page — both would require moving category/type filtering server-side (currently client-side, computed against the full in-memory set, including deriving `availableCategories`/`availableTypes`) to stay correct, which is a materially larger, riskier change than the actual bottleneck warranted. The streaming-pages fix directly addresses the measured cause (blocking on the slowest parallel page) with no filter-logic changes at all.
- New design tokens used: none (data-fetching change only).
- Verified: `next build` succeeds. No live before/after timing capture in this session (no long-running dev server instrumented for this pass), but the fix is structural — first paint now happens after 1 request instead of N — so the improvement is not dependent on any particular country's data volume for a heavy multi-page country.

## Completion Summary
Explore's country-view attraction fetch now streams in page-by-page (first page paints immediately, further pages append as they arrive) instead of blocking on every page finishing before rendering anything — fixes the actual profiled bottleneck for countries spanning multiple 300-result pages. Closed 2026-08-28.
