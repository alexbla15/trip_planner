# Task: Multi-select type filtering in shared AttractionFilter component

Status: done
Track: B
Track reason: Reuses an existing, already-shipped interaction pattern (multi-select chips) from Explore City view — no new visual pattern, pure logic/component refactor.

Goal: [attraction-type-filter-everywhere](goals/attraction-type-filter-everywhere.md)

## Problem
The multi-select category + type chip filter that powers Explore → City view (`src/app/explore/ExploreClient.tsx`, ~lines 122-124 for state, ~750-790 for UI) is implemented inline and not reusable. The shared `src/components/AttractionFilter/AttractionFilter.tsx` component that other views use (Trip Details attractions tab, Attraction Search Modal) only supports single-select category filtering, not individual types. This blocks reusing the richer filter anywhere else.

## Goal
Extract City view's multi-select category + type chip logic into the shared `AttractionFilter` component so every other attraction-list view can adopt the same capability without reimplementing it.

## Requirements
- `AttractionFilter` supports multi-select categories AND multi-select individual types (not just category), matching City view's current behavior and chip styling.
- Chips are computed dynamically from whichever attractions are passed in (as City view does today via `availableCategories`/`availableTypes`), so each consuming view only shows chips relevant to its own data set.
- Existing consumers (`TripDetailClient.tsx`, `AttractionSearchModal.tsx`) continue to compile and render correctly against the new prop API — this task may need to update their call sites minimally to keep them working, but upgrading their actual filtering UX is out of scope (handled by their own tasks in this goal).
- Explore → City view (`ExploreClient.tsx`) is refactored to consume the shared component instead of its inline implementation, with no regression in its current filter behavior.
- Uses `useAttractionTypes()` (`src/hooks/useAttractionTypes.ts`) for category/type data, consistent with existing usage.

## Constraints
- Keep the existing single-select category-only behavior available/default for consumers that don't opt into multi-select or type-level filtering yet, to avoid breaking `TripDetailClient.tsx` / `AttractionSearchModal.tsx` mid-refactor (their own upgrade tasks come later in this goal).
- Follow `docs/DESIGN_SYSTEM.md` for chip styling — no new visual pattern should be introduced.
- Read `AGENTS.md` before touching Next.js routing/conventions — this project has breaking changes from standard Next.js.

## Out of scope
- Upgrading Trip Details attractions tab, Attraction Search Modal, Attraction Picker Modal, or Explore Country view to actually use the new multi-select/type capability — each has its own task in this goal.

## Implementation Notes
- Files created/modified:
  - `src/components/AttractionFilter/AttractionFilter.types.ts` — added optional multi-select props (`selectedCategories`/`onCategoriesChange`), optional type-row props (`types`/`selectedTypes`/`onTypesChange`), optional `categoryLabel`/`typeLabel` section labels, `hideSearch`, and made `searchValue`/`onSearchChange`/`selectedCategory`/`onCategoryChange` optional.
  - `src/components/AttractionFilter/AttractionFilter.tsx` — component now branches on `multiSelect = !!onCategoriesChange`: single-select mode (default) renders exactly as before (`All` chip + one active category); multi-select mode toggles chips into/out of an array and adds an optional second "types" chip row with per-type icons (`t.icon`). `hideSearch` skips the search bar entirely.
  - `src/components/AttractionFilter/AttractionFilter.module.css` — added `.filterSection`/`.filterSectionLabel` for the optional labeled chip-row wrapper.
  - `src/app/explore/ExploreClient.tsx` — City view's inline category/type chip JSX (and the local `toggleCategory`/`toggleType` handlers) replaced with a single `<AttractionFilter hideSearch multiSelect .../>` call; added `handleCategoriesChange` to preserve the existing "deselecting a category also drops its selected types" behavior, since that side effect previously lived inside `toggleCategory`.
  - `src/app/trips/[id]/TripDetailClient.tsx`, `src/components/AttractionSearchModal/AttractionSearchModal.tsx` — untouched; both already called only the single-select prop subset, which is unaffected by the new optional props.
- Deviations from task requirements:
  - City view previously wrapped Categories and Types in two separate bordered `filterSection` divs (each with its own top divider); the shared component now renders both inside one outer `filterSection` wrapper with per-row labels but no divider between the two rows. Filtering behavior and available chips are unchanged — this is a minor visual simplification of the divider only.
  - Category chips in City view now show a category icon (matching the shared component's existing single-select rendering) — previously text-only. This satisfies `docs/LEARNINGS.md`'s "Interactive chips must have icons" design rule rather than violating it, so treated as a fix, not a regression.
- New design tokens used: none — reused existing chip token/color patterns already defined in `AttractionFilter.module.css`.
- Verification: `npx tsc --noEmit` clean; `npx eslint` on changed files shows only pre-existing, unrelated warnings/errors (untouched lines); `next build` succeeds, all 40 routes prerender; dev server restarted post-build (per the documented `next build` + `next dev` manifest-corruption pattern) and `/explore` returns 200.

## Completion Summary
Extracted Explore City view's inline multi-select category+type chip filter into the shared `AttractionFilter` component (now supporting an opt-in multi-select mode with an optional type row), and refactored City view to consume it — with no change to its existing filtering behavior and zero changes needed in the two existing single-select consumers (Trip Details tab, Attraction Search Modal). Confirmed by the user on 2026-08-18. This unblocks the remaining 4 tasks in the `attraction-type-filter-everywhere` goal to adopt the same multi-select/type filter in their own views.
