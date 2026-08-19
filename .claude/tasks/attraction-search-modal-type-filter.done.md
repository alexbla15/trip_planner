# Task: Multi-select type filter in Attraction Search Modal

Status: done

## Completion Summary
Attraction Search Modal now supports the same multi-select category + type chip filter as Explore and Trip Details, via the shared `AttractionFilter` component, with chips scoped live to the current search results. Confirmed by the user on 2026-08-19.
Track: B
Track reason: Reuses the `AttractionFilter` component's multi-select mode shipped in [[attraction-filter-shared-type-support]] — no new visual pattern, upgrading an existing consumer's props.

Goal: [attraction-type-filter-everywhere](goals/attraction-type-filter-everywhere.md)

## Problem
`src/components/AttractionSearchModal/AttractionSearchModal.tsx` (used to search/add existing attractions to a trip, scoped to one country) already uses the shared `AttractionFilter` component in single-select category mode (`selectedCategory`/`onCategoryChange`, state at line 33, filter applied in `filteredResults` ~lines 85-90, rendered ~lines 160-169). There's no way to filter search results by individual type, and only one category can be selected at a time.

## Goal
Let a user filter this modal's search results by multiple categories and/or individual types at once, matching the capability already shipped in Explore and Trip Details.

## Requirements
- Replace `selectedCategory: string | null` state with `selectedCategories: string[]`, and add `selectedTypes: string[]`.
- Wire the `<AttractionFilter>` call (~line 160) to multi-select mode: `selectedCategories`/`onCategoriesChange`, plus `types`/`selectedTypes`/`onTypesChange` for the type row.
- `categories` currently comes straight from `useAttractionTypes()` (~line 35, all categories globally, not scoped to search results — see the documented convention in `docs/LEARNINGS.md`: "API type vs category param mismatch — keep category filter client-side", this modal already filters client-side). Decide whether to keep global `categories`/add a `types` list from `useAttractionTypes()` directly, or scope both to only what's present in `results` (like Explore/Trip Details do) — read how `filteredResults` behaves today before deciding; prefer scoping to `results` for consistency with the other two views unless there's a reason not to (e.g. it would make chips disappear distractingly while the user is still typing/before results arrive).
- `filteredResults` (~lines 85-90) updates to match ANY selected category OR type, AND'd together — same semantics as `ExploreClient.tsx`'s `matchesChipFilters` / `TripDetailClient.tsx`'s equivalent. Read both before reimplementing, don't diverge.
- Reset-on-open effect (~lines 42-50) must reset `selectedTypes` too, not just the old `selectedCategory`.
- The "Show all results" empty-state button (~line 251, currently `onClick={() => setSelectedCategory(null)}`) must clear both categories and types.

## Constraints
- Follow `docs/DESIGN_SYSTEM.md` for chip styling — reuse the shared `AttractionFilter` component, don't hand-roll new chip markup.
- Keep the search bar (`searchValue`/`onSearchChange`/`inputRef` props) — don't pass `hideSearch`.
- This modal is used in at least 2 places (regular attractions, residence search per `subtypeFilter`) — check both still work.
- Read `docs/LEARNINGS.md` before implementing — it documents: (a) a prior bug pattern where extracting a toggle handler into a shared component's `onChange` can silently drop a cascading side effect (category→type cleanup); (b) this exact modal's `beforeBody` slot pattern (search bar must stay outside the scrollable results, already handled by `ModalShell`'s `beforeBody` — don't restructure it).
- Read `AGENTS.md` before touching Next.js routing/conventions — this project has breaking changes from standard Next.js.

## Out of scope
- Attraction Picker Modal — separate task in this goal.
- Changes to `ModalShell`, `searchAttractionsByCountry`, or the debounced search mechanics.

## Implementation Notes
- Files created/modified:
  - `src/components/AttractionSearchModal/AttractionSearchModal.tsx` — replaced `selectedCategory: string | null` with `selectedCategories: string[]` + new `selectedTypes: string[]`. Scoped both `presentCategories`/`presentTypes` to the current `results` (not global `categories` from `useAttractionTypes()`), consistent with Explore/Trip Details — chips only show categories/types actually present in the search results, and update live as new results arrive. Added `handleCategoriesChange` cascade helper (same pattern as the other two views). `filteredResults` now applies AND-between-groups/OR-within-group category+type matching. Reset-on-open effect and the "Show all results" empty-state button both clear `selectedCategories`+`selectedTypes` now, not just the old single category.
  - `<AttractionFilter>` call wired to multi-select mode; kept `searchValue`/`onSearchChange`/`inputRef` as before (no `hideSearch`); did not pass `categoryLabel`/`typeLabel` — this modal's search bar is a compact single toolbar (not a sectioned sidebar like Explore), so kept the existing label-less chip-row look for both rows to avoid changing its visual density.
- Deviations from task requirements: none.
- New design tokens used: none.
- Verification: `npx tsc --noEmit` clean; `npx eslint` shows only the same pre-existing `react-hooks/set-state-in-effect` warning on the reset-on-open effect (pre-existing pattern, only new lines added inside it, not a new violation); `next build` succeeds, all 40 routes prerender; dev server restarted post-build, `/explore` confirmed loading (200). Did not exercise the modal live in a browser session (no logged-in session available in this environment) — confirmed via code read that both call sites (`TripDetailClient.tsx`'s regular-attraction search and residence search via `subtypeFilter`) pass only external props unaffected by this internal-state change.
