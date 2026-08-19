# Task: Category/type filter in Attraction Picker Modal

Status: intake
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
