# Task: Shared Utils Extraction

Status: intake
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
