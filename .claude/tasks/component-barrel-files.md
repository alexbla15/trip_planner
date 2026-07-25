# Task: Component Barrel Files

Status: intake
Track: B
Track reason: Refactor/cleanup — internal structure only, no user-facing visual change.
Goal: .claude/tasks/goals/architecture-standards-remediation.md

## Problem
Only 2 of 33 component folders (`IconPicker`, `TripTabBar`) have an `index.ts` barrel. A top-level `src/components/index.ts` barrel exists but is inconsistently honored — `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/trips/TripsClient.tsx`, and every page importing `RouteGuard` (`profile`, `trips`, `new-trip`, `trips/[id]/edit`, `trips/[id]`) bypass it with deep imports like `@/components/RouteGuard/RouteGuard` even though the barrel already re-exports it. `src/lib` and `src/hooks` have no barrels at all — every consumer imports by exact filename. There's also cross-component reach-through: `src/components/AttractionTypePicker/AttractionTypePicker.tsx:6` imports directly from `NewAttractionModal`'s internal `AttractionTypeChip`, and `src/contexts/AttractionsContext.tsx:4` imports a type directly from `NewAttractionModal/attraction.types`.

## Goal
Every shared directory (`components/*`, `lib`, `hooks`, `services`) is imported through a barrel; no file imports another module's internals via a deep path.

## Requirements
- Add an `index.ts` barrel to each of the 31 component folders currently missing one, re-exporting its public component(s) and types.
- Add `src/lib/index.ts`, `src/hooks/index.ts`, and `src/services/index.ts` (services module created by the now-merged `data-fetching-service-layer` task) barrels.
- Keep `src/components/index.ts` as the single top-level re-export; update every file that currently deep-imports a component already covered by it (`src/app/page.tsx`, `src/app/layout.tsx`, `src/app/trips/TripsClient.tsx`, all `RouteGuard` importers, etc.) to import from `@/components` instead.
- Fix the two cross-component reach-throughs (`AttractionTypePicker.tsx` → `NewAttractionModal`, `AttractionsContext.tsx` → `NewAttractionModal`) to import via the target folder's own barrel instead of its internal file path.
- Update all `@/lib/<file>` and `@/hooks/<file>` deep imports codebase-wide to go through the new `src/lib` / `src/hooks` barrels.

## Constraints
- Zero behavior change — this is purely an import-path refactor.
- Depends on `data-fetching-service-layer` and `shared-utils-extraction` landing first, since this task's barrel work covers `src/services` and `src/lib`, and touches many of the same files those tasks already modified — sequencing avoids merge conflicts and duplicate edits.
- Watch for circular-import risk when a component folder's barrel re-exports something another component in the same barrel depends on — resolve by having the dependent import the specific sibling folder's barrel, not the top-level `src/components` barrel, if a cycle appears.
- Run typecheck/build after this pass before moving to the next task in the goal.

## Out of scope
- Data fetching service layer and utils extraction (separate, prerequisite tasks).
- Next.js practice fixes (separate task: `nextjs-practice-fixes`).
