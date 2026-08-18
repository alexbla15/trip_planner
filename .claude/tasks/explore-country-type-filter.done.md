# Task: Attraction type filter in Explore Country view

Status: done

## Completion Summary
Explore → Country view gained the same multi-select category/type filter as City view, reusing the shared `AttractionFilter` component with zero new UI code — narrowing both the sidebar's attraction count and the map pins, with the filter block placed above the "Cities" list per the user's follow-up request. Confirmed by the user on 2026-08-18.
Track: B
Track reason: Reuses the `AttractionFilter` component's multi-select mode shipped in [[attraction-filter-shared-type-support]] — no new visual pattern, wiring existing capability into a new view.

Goal: [attraction-type-filter-everywhere](goals/attraction-type-filter-everywhere.md)

## Problem
Explore → Country view (`src/app/explore/ExploreClient.tsx`, `view === "country"` branch, ~lines 714-739 for the sidebar list and `filteredCountryAttractions`/`countryAttractions` state) only supports a visited/unvisited filter today. Category/type chips are explicitly city-view-only (see the comment above `filteredCountryAttractions`, ~line 273-274). A user browsing a whole country's attractions has no way to narrow by type before drilling into a specific city.

## Goal
Let a user filter a country's attractions by category/type, the same way they already can inside a single city.

## Requirements
- Country view gains the same multi-select category + type chip filter as City view, using the shared `AttractionFilter` component's multi-select mode (do not reimplement chip logic inline).
- Filter applies to both the sidebar's country-level attraction data and the map pins (`filteredCountryAttractions`, currently only filtered by `passesVisitedFilter`) — selecting a type must narrow the map pins too, not just a list.
- Available category/type chips are computed dynamically from `countryAttractions` (the attractions actually present in the selected country), same pattern as City view's `availableCategories`/`availableTypes`.
- Category/type filter state resets when navigating away from the country (same reset pattern already used for `selectedCategories`/`selectedTypes` in `handleBackToWorld`/`handleCountrySelect`/`handleCitySelect`/`handleBackToCountry`) — decide during implementation whether Country view reuses the same `selectedCategories`/`selectedTypes` state as City view or needs its own, based on whether a user should be able to carry a type filter from country view into a city view (read the existing reset call sites before deciding).
- `hasActiveFilters`/`activeFilterCount` (mobile filter badge) account for the new filter when active in country view.
- "Clear filters" button (currently only shown `view === "city"` in the sidebar footer) also appears in country view when a category/type filter is active.

## Constraints
- Follow `docs/DESIGN_SYSTEM.md` for chip styling — reuse the shared `AttractionFilter` component, don't hand-roll new chip markup.
- Read `AGENTS.md` before touching Next.js routing/conventions — this project has breaking changes from standard Next.js.
- Read `docs/LEARNINGS.md` before implementing — it documents a prior bug in this exact file (extracting a toggle handler into a shared component's `onChange` can silently drop a cascading side effect, e.g. clearing types when their parent category is deselected).

## Out of scope
- Changes to City view's existing filter (already done).
- Trip Details, Attraction Search Modal, Attraction Picker Modal — separate tasks in this goal.

## Implementation Notes
- Files created/modified:
  - `src/app/explore/ExploreClient.tsx` — Country view now renders the same `<AttractionFilter hideSearch multiSelect .../>` block as City view, plus a "N of M attractions" count line mirroring City view's. Reused `selectedCategories`/`selectedTypes` state as-is (decision: same state for both views, since it already resets to `[]` on every navigation transition — `handleCountrySelect`/`handleCitySelect`/`handleBackToCountry`/`handleBackToWorld` were untouched and already covered this). Extracted the category/type matching logic (previously duplicated inline in `filteredAttractions` and hardcoded-visited-only in `filteredCountryAttractions`) into one pure `matchesChipFilters(a)` helper, used by both. Renamed `visitedScopedAttractions` → `chipScopedAttractions` and generalized its source pool to `selectedCity ? cityAttractions : countryAttractions`, so `availableCategories`/`availableTypes` now compute from whichever level (country or city) is active. Widened the "Clear filters" button's view gate from `view === "city"` to `view === "city" || view === "country"`.
  - No other files touched — `hasActiveFilters`/`activeFilterCount` and the mobile filter badge already read `selectedCategories`/`selectedTypes`/`visitedFilter` without a view guard, so they picked up country view for free.
- Deviations from task requirements: none. Added the attraction count line in country view (not explicitly required) for parity with city view, so filtering has visible feedback beyond the map pins — flagging as a small addition beyond the literal requirement list.
- New design tokens used: none — reused `AttractionFilter`'s existing chip styling.
- Verification: `npx tsc --noEmit` clean; `npx eslint` shows only the same pre-existing, unrelated warnings/errors from before this task (untouched lines); `next build` succeeds, all 40 routes prerender; dev server restarted post-build and `/explore` returns 200.
- Post-review adjustment: user asked for the attraction count + filter block to appear before the "Cities" list rather than after — reordered accordingly (`tsc` re-verified clean, `/explore` re-confirmed loading).
