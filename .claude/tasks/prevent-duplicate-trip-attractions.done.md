# Task: Prevent duplicate attractions within a trip (UI gap — backend already dedups)

Status: done
Track: B
Track reason: bug fix for a frontend state bug (existing entries duplicate in the UI list); backend DB-level dedup already exists and works correctly. Fix reuses an existing "already added" pattern (`AttractionPickerModal`) — no new visual pattern.

## Problem
`POST /api/trips/[id]/attractions` (`src/app/api/trips/[id]/attractions/route.ts`, lines ~255-264) already prevents true duplication: if the resolved attraction is already in `trip.attractionIds`, it returns 200 with the existing attraction and does not push again — the database never ends up with a duplicate id in a trip's `attractionIds` array.

The actual bug is on the frontend: `TripDetailClient.tsx`'s save handlers (`handleSearchAdd` etc.) unconditionally do `setAttractions((prev) => [created, ...prev])` after every successful add call — including when the backend no-op'd because the attraction was already present. This duplicates the entry in the visible attraction list (React state / UI) even though the DB stayed clean. Separately, `AttractionSearchModal` (used to search-and-add an existing attraction to a trip) has no awareness of what's already in the trip, so a user can pick an already-added attraction with no warning — no disabled state, no checkmark — and hit this bug.

Note: `AttractionPickerModal` (used only during trip *creation* in `NewTripClient.tsx`, before any trip document exists) already solves this exact problem correctly — it takes an `alreadyAdded` list, checks by `name|country|city`, and disables the button + shows a checkmark/"Added" tag for items already staged. Reuse this pattern rather than inventing a new one.

## Goal
A user can never end up with the same attraction listed twice in a trip's attraction view — neither in the database (already true) nor in the UI. Re-picking an already-added attraction in the search modal is either prevented up front (disabled/marked, matching `AttractionPickerModal`'s UX) or, at minimum, does not duplicate the on-screen list.

## Requirements
- In `TripDetailClient.tsx`'s add-handlers (`handleSearchAdd`, and any other handler that calls `addAttractionToTrip`), stop blindly prepending the returned attraction to state. Instead, check whether an attraction with that `_id` already exists in the current `attractions` state array before adding — either skip the state update (already-present case) or replace the existing entry in place, rather than prepending a second copy.
- Give `AttractionSearchModal` awareness of the trip's current attraction list (pass the existing attraction ids/names as a prop from `TripDetailClient.tsx`, same shape `AttractionPickerModal` already uses — check its exact prop shape and reuse it) so results already in the trip show a disabled state + checkmark/"Added" indicator, matching `AttractionPickerModal`'s established pattern, instead of being silently clickable.
- Apply the same "already added" awareness to `NewAttractionModal` if it also has a "search and pick existing" step reachable from the trip detail page (verify — if it only creates new attractions, this may not apply there).

## Constraints
- Do not change the backend dedup logic in `POST /api/trips/[id]/attractions` — it is already correct.
- **Do not apply id-based "already added" blocking to residences or flights** — per investigation, two stays at the same place with different check-in/out dates, or two flights sharing a flight number on different legs/dates, are legitimate distinct trip entries, not duplicates. Scope the "already added" UI treatment to regular attractions (and verify whether residence/flight add flows go through `AttractionSearchModal` at all before assuming they need the same treatment — they may have their own dedicated add modals that don't do search-and-pick-existing).
- Custom-slot entries are intentionally exempt from any dedup (each gets a fresh key) — do not touch that behavior.
- `AttractionPickerModal`'s existing `alreadyAdded`/`isAlreadyAdded` logic checks by `name|country|city`, not by `_id` (it runs before a trip exists, so there's no id to compare yet in that flow). For `AttractionSearchModal` (existing trip, ids are available), prefer checking by `_id` against `trip.attractionIds` since it's more precise — don't copy the name-based check verbatim if id-based is available and cleaner.

## Out of scope
- Any change to the backend route's dedup logic (already correct).
- Adding dedup awareness to `AttractionPickerModal` itself (creation flow) — not reported as buggy, leave as-is.
- Residence/flight duplicate prevention (explicitly not wanted per the nuance above).

## Implementation Notes
- Files created/modified:
  - `src/app/trips/[id]/TripDetailClient.tsx` — added a shared `upsertAttraction(created)` helper (replaces an already-present entry by `_id` in place instead of prepending a duplicate; prepends normally when it's genuinely new) and switched all 4 add-handlers (`handleSearchAdd`, `handleResidenceSave`, `handleFlightSave`, `handleAttractionSave`) to use it instead of the blind `setAttractions((prev) => [created, ...prev])`. Passed `existingAttractionIds={attractions.map((a) => a._id)}` to `<AttractionSearchModal>`.
  - `src/components/AttractionSearchModal/AttractionSearchModal.types.ts` + `.tsx` — new optional `existingAttractionIds?: string[]` prop; results already in that set render disabled with a green "Added" tag (replacing the `+` add icon) instead of the plain `Plus` affordance, and `handleAdd` no-ops defensively if called on an already-added id (belt-and-suspenders alongside the `disabled` attribute).
  - `src/components/AttractionSearchModal/AttractionSearchModal.module.css` — added `.resultRowAdded` (dimmed, `cursor: not-allowed`, hover suppressed) and `.addedTag`, both copied from the equivalent `AttractionPickerModal.module.css` classes per the task's "reuse the established pattern" instruction.
  - `NewAttractionModal` was **not** touched — verified it has no search-and-pick-existing step (it's a pure create form, `AttractionTypePicker` + `MapPicker` only), so the "already added" awareness requirement doesn't apply to it, as the task file anticipated.
- Deviations from task requirements: none — used `_id`-based checking in `AttractionSearchModal` as instructed (not the name-based check `AttractionPickerModal` uses, since ids are actually available here).
- New design tokens used: none — `.resultRowAdded`/`.addedTag` reuse existing tokens (`--color-success`, `--radius-full`) already used identically in `AttractionPickerModal.module.css`.

Verification: `tsc --noEmit` clean. `eslint` on both touched files shows only pre-existing `set-state-in-effect` errors on lines untouched by this change (confirmed at the same line numbers flagged earlier in this session, before any of today's edits). Full `next build` succeeds, 33 routes build clean. No API route was touched — `swagger.yaml` unaffected.

## Completion Summary
The database was already protected against duplicate attractions per trip; fixed the remaining UI gap so the trip page merges an already-added result in place instead of appending a visible duplicate row, and AttractionSearchModal now shows already-added attractions as disabled with an "Added" tag (reusing AttractionPickerModal's established pattern). Residences and flights were intentionally left untouched since duplicate names are legitimate for those subtypes. Confirmed by user 2026-07-25.
