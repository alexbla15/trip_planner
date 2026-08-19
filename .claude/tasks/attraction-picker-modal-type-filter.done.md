# Task: Category/type filter in Attraction Picker Modal

Status: done

## Completion Summary
Attraction Picker Modal (New Trip flow) now has the same multi-select category/type chip filter as every other attraction list, and that filter's collapsible/labeled behavior was centralized into the shared `AttractionFilter` component itself (rather than duplicated per-modal), then also retrofitted onto the already-shipped Attraction Search Modal per user feedback. Confirmed by the user on 2026-08-19. This closes the last task in the `attraction-type-filter-everywhere` goal.
Track: B
Track reason: Reuses the `AttractionFilter` component's multi-select mode shipped in [[attraction-filter-shared-type-support]] — no new visual pattern, adding the shared component to a view that has none of this filtering today.

Goal: [attraction-type-filter-everywhere](goals/attraction-type-filter-everywhere.md)

## Problem
`src/components/AttractionPickerModal/AttractionPickerModal.tsx` (the global attraction picker used in the New Trip flow, sourcing from `useGlobalAttractions()`'s locally-cached `globalAttractions: AttractionFormData[]`, not a server fetch) only filters by country (`countryFilter`, a `<select>`, ~lines 150-163) and city (`cityFilter`, free-text, ~lines 165-175). There is no category or type filter at all — the last remaining attraction-list view in this goal without one.

## Goal
Let a user narrow the picker's list by category/type, same capability as every other attraction list in the app.

## Requirements
- Add multi-select category + type chip filtering using the shared `AttractionFilter` component in multi-select mode, alongside the existing country `<select>` and city text filter (don't remove or restructure those two).
- This modal has no name-search text input today — pass `hideSearch` so `AttractionFilter` doesn't add one that doesn't already exist here (out of scope to add name search; not part of this goal).
- Chips are computed from `globalAttractions` — scope them to the attractions matching the *current* country/city filter (same "chips reflect what's actually filterable right now" pattern used everywhere else in this goal), so chips shrink/grow live as the user narrows by country/city, not just statically from the full unfiltered list.
- `filteredWithIndex` (~lines 79-87) extends its filter predicate to also require the selected category/type match, same AND-between-groups/OR-within-group semantics as `ExploreClient.tsx`'s `matchesChipFilters`.
- Category/type selection resets when the modal closes (~lines 47-53, the existing `isOpen` reset effect already resets `countryFilter`/`cityFilter`/`selectedIndices` — extend it).
- `globalAttractions` items are `AttractionFormData`, not the API `Attraction` type used elsewhere — confirm `.types: string[]` behaves the same way category/type lookups elsewhere expect (via `findType()`, already imported here) before assuming the existing pattern transfers directly.

## Constraints
- Follow `docs/DESIGN_SYSTEM.md` for chip styling — reuse the shared `AttractionFilter` component, don't hand-roll new chip markup (the existing country/city filter row can stay as its own custom markup — this task adds chips beside/below it, doesn't need to convert everything to `AttractionFilter`).
- This modal renders via `createPortal` directly, not `ModalShell` — don't try to force it into the `ModalShell`/`beforeBody` pattern used by `AttractionSearchModal`; just place the filter block sensibly within the existing `.filters`/`.body` structure.
- Read `docs/LEARNINGS.md` before implementing — it documents a recurring bug class in this exact goal (extracting a toggle handler into a shared component's `onChange` can silently drop a cascading side effect, e.g. clearing types when their parent category is deselected) — apply the same cascade-safe pattern used in the other 3 completed tasks.
- Read `AGENTS.md` before touching Next.js routing/conventions — this project has breaking changes from standard Next.js.

## Out of scope
- Adding a name-search text input to this modal.
- Converting the country/city filters to use `AttractionFilter`.
- Any other view — this is the last task in the goal.

## Implementation Notes
- Files created/modified:
  - `src/components/AttractionPickerModal/AttractionPickerModal.tsx` — added `selectedCategories`/`selectedTypes` state; `countryCityFiltered` is the base for both the final list and the `presentCategories`/`presentTypes` chip derivation, so chips reflect the current country/city filter live; added `handleCategoriesChange` cascade helper (same pattern as the other 3 tasks); `filteredWithIndex` now also requires category/type match (AND-between-groups/OR-within-group, matching `ExploreClient.tsx`'s `matchesChipFilters`); reset-on-close effect extended to clear the new state.
  - `src/components/AttractionSearchModal/AttractionSearchModal.tsx` (already-closed task 4, revisited here) — got the same header + foldable treatment per the user's follow-up feedback, since "Add Attraction" on Trip Details opens this modal, not the picker.
  - **Architecture note — superseded the initial per-modal approach:** the first pass hand-rolled a separate foldable toggle + CSS in each of the two modals (duplicated markup/state). Mid-session this was centralized into the shared `AttractionFilter` component itself: it now accepts `collapsible`/`collapsibleLabel` props and owns its own open/closed state, toggle button, badge, and CSS-grid collapse internally. Both modals now just pass `collapsible` and render one `<AttractionFilter hideSearch collapsible categoryLabel="Categories" typeLabel="Types" .../>` — no per-modal toggle code or duplicate CSS. This is a cleaner end state than what either task file originally specified.
- Deviations from task requirements: added the foldable/labeled chip filter (closed by default) per user follow-up feedback mid-task, then further centralized that behavior into the shared component rather than duplicating it — not in either original task's requirements. The closed-by-default fold deliberately departs from `docs/DESIGN_SYSTEM.md`'s general Collapsible Section guidance (sections should default to expanded) — an explicit, confirmed user product call for this specific secondary filter.
- New design tokens used: none — reused `--duration-base`/`--easing-out` and existing color tokens.
- Verification: `npx tsc --noEmit` clean; `npx eslint` shows only pre-existing unrelated warnings/errors; `next build` succeeds (all 40 routes prerender) after a one-off transient Google Fonts network failure resolved on retry; dev server restarted post-build multiple times across this session (including once after a real out-of-memory crash of the long-running dev process, unrelated to this code), confirmed loading each time. Could not exercise either modal live in a browser (no logged-in session in this environment) — verified via code read only, plus the user's own live testing surfaced the header/foldable follow-up request.
