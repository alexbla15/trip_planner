# Task: Nested attractions — create/edit UI (parent picker)

Status: done

Track: B
Track reason: extends an existing form (NewAttractionModal) with a picker field using existing modal/search patterns already in the design system — no new visual language.

## Problem
Task 1 (data model) and task 3 (detail display) of the `nested-attractions` goal are done — the backend fully supports `parentAttractionId` and the badges render on cards — but there is still no way for a user to actually set a parent when creating or editing an attraction. `NewAttractionModal` has no UI for it at all.

## Goal
From `NewAttractionModal` (create or edit mode), a user can search existing attractions and pick one as this attraction's parent. Once picked, Country/City/Location fields are hidden (inherited from the parent) instead of shown read-only, per user instruction.

## Requirements
- New "Located inside (optional)" field in `NewAttractionModal`.
- Opens a small search-and-select modal (new component) scoped to the current country, backed by the existing `searchAttractionsByCountry` client service.
- Search excludes: the attraction being edited itself, and any candidate that already has its own parent (one-level nesting only — mirrors backend `resolveParentLink` rule).
- Once a parent is picked: show it as a compact readonly chip (name + remove/change), and hide the Country, City, and Location (map) fields entirely.
- Clearing the parent restores the normal Country/City/Location fields.
- `validate()` must not require Country when a parent is set (mirrors backend: country only required without a parent).
- Feature is only available when a `token` is supplied to `NewAttractionModal` (new optional prop) — without it (the new-trip inline picker flow, which has no DB-backed country context yet), the field doesn't render.

## Constraints
- Follow existing component-per-folder pattern; picker lives as a sibling file inside `NewAttractionModal/` (like `MapPicker.tsx`/`OpeningHoursGrid.tsx`), not a new top-level `components/` entry — it's not reusable outside this modal.
- Modal-over-modal: picker's backdrop z-index must exceed `NewAttractionModal`'s own (1000).
- No backend changes — `createAttraction`/`updateAttraction` server-side already accept and validate `parentAttractionId` fully (built in task 1).

## Out of scope
- Self-reference guard is a client-side exclusion in the picker's results only (backend does not currently reject an attraction naming itself as parent) — not adding server-side self-check, out of scope for this UI task.
- Map-pin deduplication (task 4 of the goal) — unrelated to this form.

## Implementation Notes
- Files created:
  - `src/components/NewAttractionModal/ParentAttractionPicker.tsx` + `.module.css` — search-and-select modal, backdrop z-index 1100 (above `NewAttractionModal`'s 1000), filters out results with their own parent and (in edit mode) the attraction being edited itself.
- Files modified:
  - `src/components/NewAttractionModal/attraction.types.ts` — `AttractionFormData.parentAttractionId`/`parentAttractionName` (display-only), `NewAttractionModalProps.editingAttractionId`/`token`.
  - `src/components/NewAttractionModal/attraction.utils.ts` — `attractionToFormData` now carries the parent fields through for edit mode.
  - `src/components/NewAttractionModal/NewAttractionModal.tsx` — "Located inside (optional)" field (button when unset, chip w/ Change/Remove when set), conditionally renders only when `token` is passed; Country/City/Location fields wrapped in `{!parentAttractionId && (...)}`; `validate()` skips the Country-required check when a parent is set; `handleSave` includes `parentAttractionId` in the submitted payload.
  - `src/components/NewAttractionModal/NewAttractionModal.module.css` — `.pickParentBtn`, `.parentChip`, `.parentChipName`, `.parentChipBtn`.
  - `src/app/explore/ExploreClient.tsx` — passes `token` to all three `NewAttractionModal` call sites, `editingAttractionId` to the edit one.
  - `src/app/trips/[id]/TripDetailClient.tsx` — passes `token` and `editingAttractionId` to its `NewAttractionModal` call site.
  - `AttractionPickerModal.tsx` (new-trip inline picker) intentionally left untouched — no `token` passed there, so the field stays hidden (that flow has no DB-backed country context yet, per the task's requirements).
- Deviations from brief: none.
- New design tokens used: none — reused existing `--color-primary`/`--color-border`/`--radius-*` tokens.
- Verified live end-to-end via Playwright against the running dev server: seeded a real `_debug ParentMall` attraction via the API, opened Explore → Add Attraction in that city, confirmed the "Located inside" field only appears with `token` set, searched and picked the seed as parent, confirmed Country/City/Location fields disappeared and a chip rendered instead, saved a new `_debug ChildCafe`, and confirmed via the POST response that `parentAttractionId`/`parentAttractionName` were set and `country`/`city`/`coordinates` were inherited from the parent (`Testland`/`TestCity`/`{lat:10,lng:20}`). Cleaned up both debug attractions and the temporary script/screenshots afterward.

## Completion Summary
Built the parent-picker UI for nested attractions in `NewAttractionModal` — the last missing piece connecting the already-complete backend (task 1) and detail-display badges (task 3) to actual data entry, per the request: "parent picker from existing, once picked - readonly or don't show country, city, and coordinates on the form." Verified live end-to-end against the real dev server and DB. Closed 2026-08-24.
