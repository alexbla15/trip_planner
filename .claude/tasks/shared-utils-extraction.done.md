# Task: Shared Utils Extraction

Status: done
Track: B
Track reason: Refactor/cleanup — internal structure only, no user-facing visual change.
Goal: .claude/tasks/goals/architecture-standards-remediation.md

## Problem
35+ non-React, pure helper functions (date formatting, time/layout math, geometry, scheduling/conflict-detection algorithms, form validators) are defined at module scope directly inside component/page `.tsx` files instead of living in `src/lib`. Several are duplicated verbatim:
- `toDateValue` — copy-pasted in `AddFlightModal.tsx:32`, `AddResidenceModal.tsx:34`, `AddFreeSlotModal.tsx:30`, `AddCustomSlotModal.tsx:30` (4 copies), plus a near-duplicate `isoToDateInput` in `EditTripClient.tsx:33`
- `timeToMins`/`attractionEndMins` — duplicated in `TripDayMapWidget.tsx:51,56`, `CalendarSection.tsx:97`, and `CalendarSection.utils.ts:17,22` (3 copies)
- `getTripDays`/`formatDayLabel` — duplicated in `TripDayMapWidget.tsx:34,45` and `CalendarSection.tsx:53,64`

Other embedded pure helpers to relocate: `detectConflicts`, `findRouteNeighbour`, `legKey` (`TripDayMapWidget.tsx`); `layoutTimed`, `findEarliestFreeSlot`, `calcSpend`, `fmt`, `slotTop`, `cardPx`, `dayColumnWidth`, `calcDaySpanMinutes`, `makeHourSlots` (`CalendarSection.tsx`); `polarToCartesian`, `donutSlicePath`, `tintColor` (`CategoryDonutChart.tsx`); `getGreeting` (`src/app/page.tsx`); `validate` form validators (`LoginClient.tsx`, `RegisterClient.tsx` — keep separate, they validate different forms, but move both into `src/lib`); `typeFormFromRecord`, `catFormFromRecord`, `moodFormFromRecord` (`AdminClient.tsx`); `buildISODateTime`, `addOneDay` (`AddFlightModal.tsx`); `residenceMeta` (`ResidencesList.tsx`); `flightMeta` (`FlightsList.tsx`); `buildInitialHours` (`NewAttractionModal.tsx`); `tempId`, `buildLocal`, `applyRates`, `toApiExpenses` (`ExpensesPanel.tsx`); `makeCountryMarkerIcon`/`makeCityMarkerIcon`/`makeAttractionMarkerIcon` (`ExploreMapWidget.tsx`).

## Goal
No pure, non-React helper function is defined inside a component/page file when it could live in `src/lib`; zero duplicate implementations of the same logic remain.

## Requirements
- Create grouped modules under `src/lib`, e.g. `src/lib/date.ts` (date formatting/arithmetic), `src/lib/schedule.ts` (time math, conflict detection, layout calculations), `src/lib/geometry.ts` (SVG/polar math), `src/lib/mapIcons.ts` (Leaflet icon factories), `src/lib/validation.ts` (form validators) — use judgment on grouping, but keep each module focused on one concern.
- Move every helper listed above into the appropriate `src/lib` module and update all call sites to import from there.
- Deduplicate: `toDateValue` → single implementation in `src/lib/date.ts`, used by all 4 modals + `EditTripClient.tsx`. `timeToMins`/`attractionEndMins` → single implementation in `src/lib/schedule.ts`, used by `TripDayMapWidget.tsx`, `CalendarSection.tsx`, and `CalendarSection.utils.ts`. `getTripDays`/`formatDayLabel` → single implementation, used by both current call sites.
- Existing correctly-separated files (`src/components/CoverImageField/CoverImageField.utils.tsx`, `src/components/IconPicker/iconPicker.utils.tsx`) are examples of the target end-state for component-specific (non-shared) helpers — leave those as-is since they're already component-scoped correctly; only move helpers that are generic/reusable or duplicated.

## Constraints
- Zero behavior change — pure functions should produce identical output before and after the move; verify with existing usages/tests where present.
- `src/app/trips/[id]/CalendarSection.utils.ts` already exists as a colocated utils file — fold its `timeToMins`/`attractionEndMins` into the new shared `src/lib/schedule.ts` rather than leaving a third copy.
- No barrel file (`src/lib/index.ts`) yet — that's handled in the follow-up task `component-barrel-files`.
- Depends on `data-fetching-service-layer` being merged first (avoids overlapping edits in files like `AdminClient.tsx` and `ExpensesPanel.tsx` that are touched by both tasks).
- Run typecheck/build after this pass before moving to the next task in the goal.

## Out of scope
- Data fetching service layer (separate task, should land first: `data-fetching-service-layer`).
- Barrel files (separate task: `component-barrel-files`).
- Any behavior or output changes to the moved functions.

## Implementation Notes
- Files created: 9 modules under `src/lib/` — `date.ts` (toDateValue, buildISODateTime, addOneDay, getTripDays, formatDayLabel, getGreeting), `schedule.ts` (timeToMins, attractionEndMins, legKey, detectConflicts, findRouteNeighbour, layoutTimed, findEarliestFreeSlot, dayColumnWidth, calcDaySpanMinutes, calcSpend, fmt, slotTop, cardPx, makeHourSlots + LayoutItem/ConflictGroup types), `geometry.ts` (polarToCartesian, donutSlicePath, tintColor), `mapIcons.tsx` (makeCountryMarkerIcon, makeCityMarkerIcon, makeAttractionMarkerIcon — `.tsx` since these embed JSX for `renderToStaticMarkup`), `validation.ts` (validateLoginForm, validateRegisterForm), `adminForms.ts` (typeFormFromRecord/catFormFromRecord/moodFormFromRecord + their FormState types), `attractionDisplay.ts` (residenceMeta, flightMeta), `openingHours.ts` (buildInitialHours), `expenses.ts` (tempId, buildLocal, applyRates, toApiExpenses + LocalExpense type).
- Files modified (local helper removed, import from `src/lib` added): `AddFlightModal.tsx`, `AddResidenceModal.tsx`, `AddFreeSlotModal.tsx`, `AddCustomSlotModal.tsx`, `EditTripClient.tsx`, `TripDayMapWidget.tsx`, `CalendarSection.tsx`, `CalendarSection.utils.ts`, `CategoryDonutChart.tsx`, `src/app/page.tsx`, `LoginClient.tsx`, `RegisterClient.tsx`, `AdminClient.tsx`, `ResidencesList.tsx`, `FlightsList.tsx`, `NewAttractionModal.tsx`, `ExpensesPanel.tsx`, `ExploreMapWidget.tsx`.
- Deviations from task requirements:
  - **`CalendarSection.utils.ts`'s `attractionEndMins` was NOT folded into the shared `src/lib/schedule.ts` version, despite the task explicitly asking for that.** On inspection the two "duplicate" implementations weren't actually duplicates: the shared one applies a `MIN_OVERLAP_DURATION_MINS` (30-min) floor to the computed duration and asserts `plannedTime` is set, while `CalendarSection.utils.ts`'s version has no floor and tolerates a missing `plannedTime` (returns 0). Routing it through the shared version would have silently changed the alert-computation logic (closed/conflict/overflow warnings) for any attraction with an actual duration under 30 minutes. Kept it local with a comment explaining why, and only deduplicated `timeToMins` (which genuinely was identical in both places).
  - `EditTripClient.tsx`'s `isoToDateInput` and `AddFlightModal.tsx`'s `toDateValue` were near-identical but not byte-identical (`isoToDateInput` guarded `if (!iso) return ""` before constructing the Date; `toDateValue` wraps in try/catch instead). Verified both produce `""` for falsy/invalid input either way, so this dedup is safe — `toDateValue` is a strict superset (also survives a malformed-but-truthy date string without throwing, where the original would not have).
  - Two lint warnings appeared immediately after the mechanical moves (`LayoutItem` imported-but-unused in `CalendarSection.tsx`, `attractionEndMins` imported-but-unused in `TripDayMapWidget.tsx` — both cases where the moved function is only used *inside* another moved function, not called directly by the file that imports it) and were removed; final lint output matches the pre-task baseline exactly.
- New design tokens used: none (no UI change).

Verification: `npx tsc --noEmit` clean; `npm run build` succeeds (Turbopack, all 33 routes); `npm run lint` reports the identical 70 problems (47 errors / 23 warnings) as the pre-task baseline.

## Completion Summary
Moved 35+ pure helper functions out of 18 component/page files into 9 new focused modules under `src/lib/`, deduplicating the genuinely-identical copies (`toDateValue`: 4 → 1, `timeToMins`: 3 → 1, `getTripDays`/`formatDayLabel`: 2 → 1). One planned dedup was deliberately skipped: `CalendarSection.utils.ts`'s `attractionEndMins` looked like a duplicate of the shared version but had different edge-case behavior (no minimum-duration floor, tolerant of a missing `plannedTime`); merging it would have changed which schedule-conflict alerts fire, so it was kept local instead. Verified with `tsc`, `next build`, and `lint` (matching the pre-task baseline exactly). Confirmed done by the user on 2026-07-25.
