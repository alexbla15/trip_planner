# Task: Component Barrel Files

Status: done
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
- **`src/lib/mongoose.ts` and `src/lib/auth.ts` are server-only** (Node `mongoose` driver; `jsonwebtoken` + `JWT_SECRET`). Do NOT re-export them from `src/lib/index.ts` — a barrel that includes them would pull server-only code (and its Node-core dependencies) into the module graph of any client component that imports anything else from `@/lib`, which can break the client build or bundle server secrets client-side. Either exclude them from the barrel entirely (their handful of server-side consumers — API routes — can keep importing them directly by filename, which is fine since route handlers are never client-bundled), or verify explicitly that Next.js's build has no client-bundle regressions before including them. After adding the `src/lib` barrel, run `npm run build` and check the client bundle / route list for anomalies, not just that the build exits 0.
- Zero behavior change — this is purely an import-path refactor.
- Depends on `data-fetching-service-layer` and `shared-utils-extraction` landing first, since this task's barrel work covers `src/services` and `src/lib`, and touches many of the same files those tasks already modified — sequencing avoids merge conflicts and duplicate edits.
- Watch for circular-import risk when a component folder's barrel re-exports something another component in the same barrel depends on — resolve by having the dependent import the specific sibling folder's barrel, not the top-level `src/components` barrel, if a cycle appears.
- Run typecheck/build after this pass before moving to the next task in the goal.

## Out of scope
- Data fetching service layer and utils extraction (separate, prerequisite tasks).
- Next.js practice fixes (separate task: `nextjs-practice-fixes`).

## Implementation Notes
- Files created/modified:
  - New barrels: `index.ts` added to all 31 component folders that lacked one, plus `src/lib/index.ts`, `src/hooks/index.ts`, `src/services/index.ts`.
  - Rewritten: `src/components/index.ts` (folder-barrel re-exports instead of deep files; adds previously-missing `ThemeToggle`, `CitiesMap`/`CountriesMap` type only, `AddFreeSlotModal`).
  - Cross-reach fixes: `AttractionTypePicker.tsx` and `AttractionsContext.tsx` now import from `@/components/NewAttractionModal` instead of its internal files.
  - ~50+ consumer files updated to import components/hooks/services/lib through their barrels instead of deep paths (all `src/app/**`, most of `src/components/**`).
- Deviations from requirements:
  - **`src/lib/mapIcons.tsx` excluded from `src/lib/index.ts`** (in addition to the already-specified `mongoose.ts`/`auth.ts` exclusion). It imports `react-dom/server` (`renderToStaticMarkup`), which Next.js forbids in any module reachable from a Client Component's graph. Barreling it broke the build (`You're importing a component that imports react-dom/server`) for every client component importing anything else from `@/lib` (e.g. `TripCard`, `CurrencySelect`, `RegisterClient`). Its one consumer (`ExploreMapWidget.tsx`) now imports directly from `@/lib/mapIcons`.
  - **`CitiesMap`/`CountriesMap` excluded as *value* exports from `src/components/index.ts`** (the `CityEntry` type is still barreled — type-only imports are erased and can't force module evaluation). Both are Leaflet-based and run module-scope DOM/`window`-touching setup (`L.Icon.Default.mergeOptions`, etc.). Every actual consumer (`AnalyticsClient.tsx`, `ProfileClient.tsx`) already loads them via `next/dynamic(..., { ssr: false })` pointed at the component file directly, never through the barrel — so re-exporting them as barrel values only added an unwanted SSR-graph path. Doing so broke static prerendering of `/admin` and `/analytics` (`ReferenceError: window is not defined`) because those pages import unrelated things from `@/components` (e.g. `IconPicker`), which pulled the whole barrel's module graph — including Leaflet's module-scope side effects — into the server bundle.
  - `NewAttractionModal.tsx` keeps a direct `@/lib/openingHours` import (not the `@/lib` barrel) to break a circular dependency: `lib/index.ts → openingHours.ts → components/NewAttractionModal/index.ts → NewAttractionModal.tsx → @/lib`.
  - All `src/app/api/**/route.ts` files keep direct `@/lib/mongoose` and `@/lib/auth` imports, never the `@/lib` barrel, per the task's own constraint.
- Verification: `npx tsc --noEmit` clean; `npm run build` succeeds with all 33 routes generated (no anomalies — `/admin` and `/analytics` prerender as static, no server-only or Leaflet code leaked into unrelated client bundles); `npm run lint` matches the established baseline exactly (70 problems: 47 errors, 23 warnings — no new issues).
- New design tokens used: none (Track B, no visual change).

## Completion Summary
Added `index.ts` barrels to all 31 component folders plus `src/lib`, `src/hooks`, and `src/services`, and migrated every deep-import call site codebase-wide (~50+ files) to import through the appropriate barrel. Fixed the two cross-component reach-throughs into `NewAttractionModal`. Verification surfaced two build-breaking barrel-over-inclusion issues not anticipated in the brief (`mapIcons.tsx`'s `react-dom/server` import, and `CitiesMap`/`CountriesMap`'s module-scope Leaflet/`window` setup) — both fixed by excluding them from their respective barrels' value exports, following the same pattern already established for `mongoose.ts`/`auth.ts`. `tsc --noEmit`, `npm run build` (all 33 routes, no anomalies), and `npm run lint` (70/47/23, matching baseline) all pass. Confirmed done by the user on 2026-07-25.
