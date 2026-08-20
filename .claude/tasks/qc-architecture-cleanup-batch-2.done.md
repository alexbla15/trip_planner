# Task: QC Architecture Cleanup — Batch 2 (post eb87f85)

Status: done
Track: B
Track reason: Refactor/cleanup and bug fix — no new UI surface, no new visual pattern; all fixes are internal structure, type-safety, constant extraction, and one silent-failure bug fix within existing screens.

## Problem
A `/qc` architecture audit of all 46 commits since the last full QC pass (`eb87f85`) found 19 violations across 7 rule categories, spanning the components/hooks/lib layer and the pages/API/models layer:
- Inline pure logic left in component bodies instead of `.utils.ts` files
- Hardcoded constants/colors duplicated instead of reused from existing shared modules
- Monolithic, unsplit JSX in several page-level client components
- Duplicated form/logic blocks across sibling components
- A silent-failure delete flow that leaves the UI stuck
- Scattered `any` type usage weakening type safety
- Two prop interfaces missing JSDoc that their siblings have

This isn't a bug affecting end users today, but it's accumulated architecture debt that will make the next feature batch slower and riskier to build on.

## Goal
Every violation below is fixed, `tsc`/lint pass clean, and no existing behavior regresses (especially the trip create/edit forms, attraction pickers, and map widgets touched by these changes).

## Requirements

**1. Utility Separation**
- Extract slice-math computation in `src/components/CategoryDonutChart/CategoryDonutChart.tsx:38-98` into `CategoryDonutChart.utils.ts`.
- Extract the `cityOptions` filter/sort logic in `src/components/NewAttractionModal/NewAttractionModal.tsx:64-69` into a utility function.

**2. Hand-Coded Constants**
- Replace hardcoded hex colors in `src/components/CitiesMap/CitiesMap.tsx:113-163` with the existing `src/lib/mapBoundaryColors.ts`.
- Replace hardcoded hex/box-shadow values in `src/lib/mapIcons.tsx:10,26,28,41` with shared color constants.
- Move `RESIDENCE_TYPES` out of `src/components/AddResidenceModal/AddResidenceModal.tsx:19` into a `.constants.ts` file, matching `NewAttractionModal`'s existing pattern (`attraction.constants.ts`).
- De-duplicate the travel-mode color map currently hardcoded separately in `src/app/explore/ExploreMapWidget.tsx:17-21` and `src/app/trips/[id]/TripDayMapWidget.tsx:313,574` into one shared constant, imported by both.

**3. Page Construction**
- Break up the monolithic form JSX in `src/app/new-trip/NewTripClient.tsx:142-491` into composed subcomponents.
- Break up the monolithic form JSX in `src/app/trips/[id]/edit/EditTripClient.tsx:183-517` into composed subcomponents.
- Break up the ~500-line inline render in `src/app/trips/[id]/CalendarSection.tsx:505-999` into composed subcomponents (day-column/sidebar-card markup).

**4. Component Reusability / DRY**
- Create a shared `TripDetailsForm` component used by both `NewTripClient` and `EditTripClient` (currently near-duplicate forms) — this naturally follows from requirement 3's decomposition.
- Add a shared `useReverseGeocodeAutofill` hook used by `AddResidenceModal.tsx:47-60` and `NewAttractionModal.tsx:72-89` (currently duplicated verbatim).
- Add a shared hook/util for the category/type filter logic duplicated between `AttractionPickerModal.tsx:97-120` and `AttractionSearchModal.tsx:89-112`.
- Consider a shared generic form wrapper for `AdminClient.tsx`'s three near-identical CRUD forms (`TypeForm`/`CategoryForm`/`MoodTagForm`, lines 53-405).
- De-duplicate `attractionToFormData` between `ExploreClient.tsx:43-61` and `TripDetailClient.tsx:341-359`.

**5. Error Handling**
- Fix `EditTripClient.tsx` `handleDelete` (lines 158-170) — it currently swallows delete failure silently and leaves the button permanently stuck in a disabled "Deleting…" state. Reset `deleting` state on failure and surface an error (use the existing toast system per [[feedback-service-error-convention]] pattern if applicable).

**6. Type Safety**
- Replace `openingHours?: any` in `src/lib/services/attractions.service.ts:122-123,246,448-449` with a proper `OpeningHours` type (check `src/types/attraction.ts` for an existing definition first).
- Remove/properly type the `any` casts used for Leaflet icon patching in `CitiesMap.tsx:18`, `ExploreMapWidget.tsx:34-36`, `TripDayMapWidget.tsx:29-31` (keep `eslint-disable` only if truly unavoidable, but narrow the type).
- Fix the double-cast (`as unknown as ObjectId`) in `src/app/api/attraction-types/[id]/route.ts:35`.
- Type the `.json()` response shape consumed in `LoginClient.tsx:82`, `ResetPasswordClient.tsx:46-52`, `EditTripClient.tsx:143-146`.

**7. Documentation**
- Add JSDoc to `AttractionPickerModalProps` in `AttractionPickerModal.tsx:24-29`, matching the sibling `AttractionSearchModalProps` style.
- Add JSDoc to `CitiesMapProps`/`CityEntry` in `CitiesMap.tsx:26-38`, documenting the boundary-caching/fallback behavior.

## Constraints
- No behavior change intended anywhere except requirement 5 (the delete-failure bug) — all other items are structural/type refactors and must preserve existing UI/UX exactly.
- Follow existing project conventions: service layer error handling per [[feedback-service-error-convention]], barrel files, `.constants.ts`/`.utils.ts` split per `AGENTS.md`/QC rules.
- This is a large batch — the developer may split implementation into logical commits per requirement group (constants/utils extraction, page decomposition, DRY hooks, type safety, docs) rather than one giant commit.

## Out of scope
- No new features or UI surfaces.
- Not addressing any QC categories that passed (data fetching layer, barrel imports, route caching, hydration/state, security) — those were clean.
- Not re-auditing files outside the 46-commit diff range (pre-`eb87f85` code).

## Implementation Notes

**Files created:**
- `src/components/CategoryDonutChart/CategoryDonutChart.utils.ts`
- `src/components/NewAttractionModal/NewAttractionModal.utils.ts`
- `src/components/NewAttractionModal/attraction.utils.ts`
- `src/components/AddResidenceModal/AddResidenceModal.constants.ts`
- `src/components/CitiesMap/CitiesMap.constants.ts`
- `src/lib/mapIcons.constants.ts`
- `src/lib/travelModeColors.ts`
- `src/lib/leafletIconFix.ts`
- `src/hooks/useReverseGeocodeAutofill.ts`
- `src/hooks/useAttractionCategoryTypeFilter.ts`

**Files modified:** `CategoryDonutChart.tsx`, `NewAttractionModal.tsx`, `AddResidenceModal.tsx`, `CitiesMap.tsx`, `mapIcons.tsx`, `ExploreMapWidget.tsx`, `TripDayMapWidget.tsx`, `EditTripClient.tsx`, `AttractionPickerModal.tsx`, `AttractionSearchModal.tsx`, `attractions.service.ts`, `attraction-types/[id]/route.ts`, `LoginClient.tsx`, `ResetPasswordClient.tsx`, `TripDetailClient.tsx`, `ExploreClient.tsx`, `types/attraction.ts`, `services/auth.service.ts`, `services/trips.service.ts`, plus barrel files (`components/index.ts`, `hooks/index.ts`, `services/index.ts`, `NewAttractionModal/index.ts`).

**Completed (requirements 1, 2, 5, 6, 7 in full; requirement 4 partially):**
- Req 1 (Utility Separation): both items done.
- Req 2 (Hand-Coded Constants): all four items done — note the map color reuse used a new `CitiesMap.constants.ts` rather than the existing `mapBoundaryColors.ts`, since that module serves a different purpose (cycling a categorical palette across N boundaries) and reusing it would have been semantically wrong, not just a literal constants move.
- Req 4 (DRY): done — `useReverseGeocodeAutofill` hook (replaces duplicated logic in `AddResidenceModal`/`NewAttractionModal`), `useAttractionCategoryTypeFilter` hook (replaces duplicated category/type filter logic in `AttractionPickerModal`/`AttractionSearchModal`), and `attractionToFormData` deduped into `NewAttractionModal/attraction.utils.ts`. **Not done:** shared `TripDetailsForm` component and `AdminClient`'s generic form wrapper — see deferred items below.
- Req 5 (Error Handling): done, with a correction to the brief — `EditTripClient.handleDelete`'s `finally` block already reset `deleting` to `false` on every path (the button was never actually stuck); the real bug was the silent failure with no user-facing error. Fixed by calling `toast.error(...)` in the catch block via the existing `useToast()` context instead of the previously-empty catch.
- Req 6 (Type Safety): done — added `OpeningHours`/`OpeningHoursDay` to `types/attraction.ts` (matches the Mongoose model's existing shape exactly) and used it to replace both `openingHours?: any` spots; replaced the double-cast in the attraction-types route with `new Types.ObjectId(...)`; added `AuthResponse`/`ResetPasswordResponse`/`TripErrorResponse` types to the relevant services for the three untyped `.json()` call sites. Also centralized the duplicated `any`-cast Leaflet default-icon patch (3 files) into `fixLeafletDefaultIcon()` while in the area, since it was the same root pattern as the flagged casts.
- Req 7 (Documentation): both items done.

**Deferred (not implemented this pass — recommend a follow-up task):**
- Req 3 (Page Construction): `NewTripClient.tsx`, `EditTripClient.tsx`, `CalendarSection.tsx` monolithic JSX were not decomposed.
- Req 4 (remainder): shared `TripDetailsForm` component (depends on Req 3's decomposition) and `AdminClient.tsx`'s generic CRUD form wrapper were not built.
- Reason: these are large, high-blast-radius JSX rewrites (300–500 lines each) across the app's most-used flows (trip create/edit, day calendar, admin). The task's own constraint says "no behavior change" for everything except the delete-failure fix — safely guaranteeing that for a rewrite this size needs live browser verification (per `docs/LEARNINGS.md`'s repeated lesson that `tsc`/`eslint`/`build` passing is not the same as a UI regression check), which wasn't done here. Splitting this off protects the low-risk, already-verified fixes (types, constants, DRY hooks, docs, the real bug fix) from being blocked on or destabilized by the risky part.

**Verification:** `npx tsc --noEmit` and `npx eslint` (targeted at every changed file) both pass with zero *new* errors/warnings — confirmed by diffing against a `git stash` baseline for every file that already had pre-existing `react-hooks/set-state-in-effect` lint debt (a project-wide, pre-existing issue unrelated to this task). Did not run `next build` — a `next dev` process was live against this project directory, and `docs/LEARNINGS.md` documents that running a production build against a live dev server corrupts its route manifest.

**Deviations from task requirements:** see "Deferred" above (Req 3, and the `TripDetailsForm`/`AdminClient` parts of Req 4). The Req 5 fix targeted the actual root cause (silent failure) rather than the brief's literal description (stuck button state), which was not accurate for the current code.

**New design tokens used:** none — this task added named constants/types, not new visual design tokens.

## Completion Summary
Closed as partially complete by user decision (2026-08-20): 5 of 7 QC requirement groups (Utility Separation, Hand-Coded Constants, Error Handling, Type Safety, Documentation) plus a partial DRY pass (two new shared hooks, one deduped utility) were implemented and verified via `tsc`/`eslint` diffed against a pre-change baseline. The remaining large-scope items — decomposing `NewTripClient.tsx`/`EditTripClient.tsx`/`CalendarSection.tsx`, the shared `TripDetailsForm` component, and `AdminClient.tsx`'s generic form wrapper — were deliberately deferred due to size/risk and are being spun into a new follow-up task (`qc-page-decomposition-followup`) rather than attempted here.
