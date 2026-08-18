# Task: Multi-select type filter in Trip Details attractions tab

Status: intake
Track: B
Track reason: Reuses the `AttractionFilter` component's multi-select mode shipped in [[attraction-filter-shared-type-support]] — no new visual pattern, upgrading an existing consumer's props.

Goal: [attraction-type-filter-everywhere](goals/attraction-type-filter-everywhere.md)

## Problem
The Trip Details page's "Attractions" tab (`src/app/trips/[id]/TripDetailClient.tsx`, ~lines 135-136 for state, ~509-528 for filtering, ~782-791 for the `<AttractionFilter>` call) already uses the shared `AttractionFilter` component, but only in single-select category mode (`selectedCategory`/`onCategoryChange`). There's no way to filter this trip's attractions by individual type (e.g. "Museum" vs. all of "Culture"), and multiple categories can't be selected at once.

## Goal
Let a user filter a trip's attraction list by multiple categories and/or individual types at once, matching the capability already shipped in Explore.

## Requirements
- Replace the single-select `selectedCategory: string | null` state (`TripDetailClient.tsx` line 136) with multi-select `selectedCategories: string[]` state, and add `selectedTypes: string[]` state.
- Wire the `<AttractionFilter>` call (~line 783) to multi-select mode: pass `selectedCategories`/`onCategoriesChange` instead of `selectedCategory`/`onCategoryChange`, and add `types`/`selectedTypes`/`onTypesChange` for the type chip row.
- `presentCategories` (currently derived from `regularAttractions`, ~line 509) needs a type-level equivalent (`presentTypes`) computed the same way, so only types actually present on this trip's attractions show as chips — same pattern as Explore's `availableCategories`/`availableTypes`.
- `filteredAttractions` (~line 518) filtering logic updates to match ANY selected category OR type (same AND-between-filter-groups, OR-within-a-group semantics already used in Explore's `matchesChipFilters` in `src/app/explore/ExploreClient.tsx` — read it before reimplementing, don't diverge).
- The `useEffect` that resets pagination on filter change (~line 530, `setPage(1)`) must also depend on the new `selectedTypes` state so page resets correctly when a type filter changes.
- Search text + category + type filters all combine correctly (existing search-by-name behavior must keep working unchanged).

## Constraints
- Follow `docs/DESIGN_SYSTEM.md` for chip styling — reuse the shared `AttractionFilter` component, don't hand-roll new chip markup.
- This view keeps its search bar (unlike Explore's sidebar, which hides it) — don't pass `hideSearch`.
- Decide whether to pass `categoryLabel`/`typeLabel` (visible section labels) based on whether the existing single-row, label-less chip layout reads clearly with two rows — use judgment, this wasn't decided at goal-planning time.
- Read `docs/LEARNINGS.md` before implementing — it documents a prior bug in `ExploreClient.tsx` (extracting a toggle handler into a shared component's `onChange` can silently drop a cascading side effect, e.g. clearing types when their parent category is deselected) that likely applies here too.
- Read `AGENTS.md` before touching Next.js routing/conventions — this project has breaking changes from standard Next.js.

## Out of scope
- Attraction Search Modal, Attraction Picker Modal, Explore Country/City views — separate tasks (or already done).
