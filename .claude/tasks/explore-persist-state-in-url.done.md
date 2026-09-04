# Task: Persist Explore view (country/city/filters) across refresh via URL

Status: done
Track: B
Track reason: state-persistence/routing logic using an existing Next.js pattern already in the codebase (useSearchParams + Suspense wrapper, see src/app/reset-password); no new UI

## Problem
On the Explore page, refreshing the browser loses the selected country, selected city, and
every active filter (categories, types, food styles, visited/trip-usage/verified) — the user
is dropped back to the world view with no filters. None of this state is reflected in the
URL, so it also can't be bookmarked, shared, or restored via back/forward.

## Goal
Selected country, selected city, and all active filters are reflected as URL query params.
Refreshing the page (or loading the URL directly) restores the exact same view.

## Requirements
- Sync these ExploreClient state values to URL query params (add/update on change, omit the
  param entirely when at its default/empty value to keep the URL clean):
  - `selectedCountry` -> `country`
  - `selectedCity` -> `city`
  - `selectedCategories` (string[]) -> `categories` (comma-joined)
  - `selectedTypes` (string[]) -> `types` (comma-joined)
  - `selectedFoodStyles` (string[]) -> `foodStyles` (comma-joined)
  - `visitedFilter` ("all"|"visited"|"unvisited") -> `visited` (omit when "all")
  - `tripUsageFilter` ("all"|"used"|"unused") -> `used` (omit when "all")
  - `verifiedFilter` ("all"|"verified"|"unverified") -> `verified` (omit when "all")
- On initial load, read these same params from the URL and initialize the corresponding
  state instead of the current hardcoded defaults
- Use `router.replace` (not `push`) so filter changes don't spam browser history, and pass
  `{ scroll: false }` so the page doesn't jump
- Follow the existing precedent in `src/app/reset-password` for using `useSearchParams` in a
  client component: it requires the page wrapped in `<Suspense>` — apply the same wrapper to
  `src/app/explore/page.tsx`

## Constraints
- Don't change any other Explore state (viewMode, gridPage, sidebarOpen, measure tool, etc.)
  — only the fields listed above
- Keep the URL clean: no query params at all for the default "world view, no filters" state

## Out of scope
- Restoring state on browser back/forward navigation after the initial page load (nice to
  have, not requested — the ask is specifically about refresh/direct URL load)
- Persisting map viewMode/zoom/pan position

## Implementation Notes
- Files created/modified:
  - src/app/explore/ExploreClient.utils.ts (new — parseExploreUrlState/buildExploreSearchParams, pure helpers, the inverse of each other)
  - src/app/explore/ExploreClient.tsx (useSearchParams/useRouter/usePathname; country/city/category/type/foodStyle/visited/used/verified state now initializes from the URL via a ref computed once on first render; new effect syncs those same fields back to the URL with router.replace + scroll:false whenever they change)
  - src/app/explore/page.tsx (wrapped ExploreClient in <Suspense fallback={<RouteLoading .../>}>, required for useSearchParams in a client component — same pattern as src/app/reset-password/page.tsx)
- Deviations from task requirements: none
- New design tokens used: none (no UI change)

## Completion Summary
Explore's selected country/city and active filters (categories, types, food styles, visited, trip-usage, verified) are now reflected in the URL query string and restored on refresh/direct load, via useSearchParams-initialized state synced back with router.replace. Confirmed by the user 2026-09-04, including that multi-select filters (categories, types, food styles) already carry multiple comma-joined values through the URL.
