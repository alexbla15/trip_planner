# Task: Allow multi-select when adding attractions to an existing trip

Status: done
Track: A
Track reason: New interaction (batch selection UI: checkboxes, selection count, "Add N Selected" action) inside AttractionSearchModal — not currently present there, and not a value already sitting in the design system tokens.

## Problem
Within a specific (existing) trip's "add attraction" flow, `AttractionSearchModal` (`src/components/AttractionSearchModal/AttractionSearchModal.tsx`) only supports adding one attraction at a time — clicking a result immediately calls `onAdd` for that single attraction (`handleAdd`, line ~85). This is inconsistent with `AttractionPickerModal` (used when creating a *new* trip in `src/app/new-trip/NewTripClient.tsx`), which already supports multi-select via checkboxes, an "N selected" count, and a batched "Add N Selected" action. Users adding attractions to an existing trip have to repeat the search-and-click cycle for every single attraction.

## Goal
Users can select multiple attractions in `AttractionSearchModal` and add them to the trip in one batch action, matching the multi-select UX already established in `AttractionPickerModal`.

## Requirements
- Bring the multi-select interaction pattern from `AttractionPickerModal` (checkbox toggle per row via a selection `Set`, `role="option" aria-selected`, footer "Add N Selected" button) into `AttractionSearchModal`.
- `onAdd` should support adding a batch of attractions (update the prop contract if it currently only accepts a single attraction).
- Preserve existing behavior for `existingAttractionIds` (already-added attractions stay disabled/marked, per current `existingIdSet` logic).
- Accessible: keyboard-operable selection, correct `aria-selected`/`aria-expanded` semantics matching the existing picker.

## Constraints
- Reuse the interaction pattern and any shared logic from `AttractionPickerModal` rather than reinventing it — check whether the selection logic can be extracted to a shared hook/util instead of duplicated.
- Must not change the search/filter behavior already in `AttractionSearchModal`.
- Follow [[feedback-avatar-url-check]] and other established conventions if attraction thumbnails are touched.

## Out of scope
- Changing `AttractionPickerModal` itself.
- Any changes to `CategoryAttractionsModal` (separate view-only drill-down flow, not an add flow).

## Design Brief

**Scoping decision:** `AttractionSearchModal` has two call sites in `TripDetailClient.tsx` — the general "Add Attraction" flow (`handleSearchAdd`) and the residence-picker flow (`handleResidenceSearchPick`, `subtypeFilter="residence"`). The residence flow hands the pick straight to `AddResidenceModal` for per-item date entry, so it is inherently single-item and must NOT become multi-select. Add an opt-in `multiSelect?: boolean` prop (default `false`) — only the general flow passes `multiSelect`.

**Prop contract change:** `onAdd` becomes `(attractions: Attraction[]) => void` unconditionally (always an array, length 1 when `multiSelect` is false/omitted). This keeps the type simple instead of a conditional union, and both existing call sites become one-line changes (`handleResidenceSearchPick` reads `attractions[0]`; `handleSearchAdd` loops and awaits `addAttractionToTrip` sequentially per item, calling `upsertAttraction` after each so the UI updates incrementally).

**Interaction (multiSelect = true), reusing `AttractionPickerModal`'s established pattern 1:1:**
- Row click toggles selection in a `Set<string>` (keyed by `attraction._id`) instead of calling `onAdd` immediately. Modal stays open.
- `<ul>` gets `role="listbox" aria-multiselectable="true"` (currently just `aria-label`). Each `<li>` gets `role="option" aria-selected={isSelected}`. Row `<button>` gets `aria-pressed={isSelected}`.
- Row visual: a small circular checkmark indicator (same visual language as `AttractionPickerModal`'s `.itemCheck`/`.checkMark` — a filled circle with a check glyph when selected, using `--color-primary`) prepended before the existing `resultIcon`. Already-added rows keep their current disabled/"Added" treatment unchanged and are not selectable.
- Footer: keep the existing `createBtn` ("Create new attraction") as the secondary action; add a primary "Add N Selected" button next to it (same filled-button treatment as `AttractionPickerModal`'s `.addBtn`), disabled when selection is empty. Clicking it calls `onAdd([...selected])` then closes.
- Selection `Set` resets whenever the modal closes/reopens (extend the existing "Reset on open" `useEffect`).

**When multiSelect is false/omitted (residence flow):** behavior is visually and functionally identical to today — clicking a row immediately calls `onAdd([attraction])` and closes. No checkbox UI, no footer "Add Selected" button.

**Tokens/patterns to reuse (no new ones):** `--color-primary`, `--radius-full`, existing `.resultRow`/`.footer` structure in `AttractionSearchModal.module.css`; mirror `AttractionPickerModal.module.css`'s `.itemCheck`/`.checkMark`/`.addBtn`/`.footerActions` class shapes translated into this module's naming.

Please invoke `/developer` to implement — full task file + this brief is the complete spec.

## Implementation Notes
- Files created/modified:
  - `src/components/AttractionSearchModal/AttractionSearchModal.types.ts` — `onAdd` now `(attractions: Attraction[]) => void`; added `multiSelect?: boolean` (default false).
  - `src/components/AttractionSearchModal/AttractionSearchModal.tsx` — added `selectedIds` state; `handleRowClick` toggles selection when `multiSelect`, otherwise adds immediately (wrapped in a 1-item array); added `handleAddSelected`; results `<ul>`/`<li>`/row get `role="listbox"`/`role="option"`/`aria-selected`/`aria-pressed` only when `multiSelect`; added a checkbox indicator (`.resultCheck`) before the icon when `multiSelect`; footer renders both the existing "Create new attraction" button and a new "Add N Selected" primary button (disabled at 0) when `multiSelect`, unchanged single button otherwise.
  - `src/components/AttractionSearchModal/AttractionSearchModal.module.css` — added `.resultRowSelected`, `.resultCheck`, `.footerMultiSelect`, `.addSelectedBtn` (mirroring `AttractionPickerModal`'s `.itemCheck`/`.checkMark`/`.addBtn` tokens: `--color-primary`, `--color-primary-dark`, `--radius-sm`, `--radius-md`).
  - `src/app/trips/[id]/TripDetailClient.tsx` — `handleSearchAdd` now takes `Attraction[]` and loops `addAttractionToTrip` sequentially, calling `upsertAttraction` after each; `handleResidenceSearchPick` now takes `Attraction[]` and reads `picked[0]`; the general "Add Attraction" `<AttractionSearchModal>` now passes `multiSelect`; the residence-picker `<AttractionSearchModal>` is unchanged (no `multiSelect`, so its behavior — single pick straight into `AddResidenceModal` — is identical to before).
- Deviations from brief: none.
- New design tokens used: none — reused `--color-primary`, `--color-primary-dark`, `--radius-sm`, `--radius-md`, `--color-text-inverse` already present in the design system.
- `npx tsc --noEmit` passes with no errors.

## Completion Summary
`AttractionSearchModal` now supports an opt-in `multiSelect` mode (checkboxes, "Add N Selected" footer action) matching `AttractionPickerModal`'s existing pattern; enabled it for the general "Add Attraction" flow on an existing trip while leaving the residence-picker flow single-item since it always opens a follow-up date-entry modal per item. Confirmed by user, closed 2026-07-26.
