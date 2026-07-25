# Task: Remove the expenses tab from trip detail

Status: reviewing
Track: B
Track reason: pure removal of an existing, self-contained feature — no new visual pattern or design decision involved.

## Problem
The trip detail page (`/trips/[id]`) has an "Expenses" tab (`?tab=expenses`) backed by `ExpensesPanel`. This feature should be removed entirely.

## Goal
The expenses tab, its UI, its API route, and its data model are fully removed from the app. No dead code, dead routes, or dead schema fields remain reachable.

## Requirements
- Remove the `expenses` entry from the `TRIP_TABS` array in `src/app/trips/[id]/TripDetailClient.tsx`, its conditional render block, and the `ExpensesPanel` import.
- Delete `src/components/ExpensesPanel/` (component, CSS module, barrel) and its export from `src/components/index.ts`.
- Delete `src/lib/expenses.ts` (`LocalExpense`, `buildLocal`, `applyRates`, `toApiExpenses`) and its export from `src/lib/index.ts`.
- Delete `src/services/expenses.service.ts` (`saveExpenses`) and its export from `src/services/index.ts`.
- Delete the API route `src/app/api/trips/[id]/expenses/route.ts`.
- Remove `IExpense`, `ExpenseSchema`, and the `expenses` field from `src/models/Trip.ts`, including its mapping in `formatTrip`.
- Remove `TripExpense` and the `expenses?` field from `src/types/trip.ts`.
- Update `swagger.yaml` to remove the `PUT /api/trips/{id}/expenses` path and any `TripExpense`/expenses schema references.
- Confirm via `next build` that removing this doesn't break anything — per prior research, `trip.expenses` is fully self-contained: Calendar "budget spent" derives from scheduled attraction prices (not expenses), and Analytics budget totals derive from `trip.budget` (a separate, unrelated field). Neither should need changes.

## Constraints
- Do not touch `trip.budget` (the planned-budget field) or anything reading it — it is unrelated to `trip.expenses` and stays as-is.
- No database migration needed — removing the Mongoose schema field simply stops reading/writing it. Any `expenses` arrays already stored on existing Trip documents in Mongo are left as harmless orphaned data; do not write a migration script for this.

## Out of scope
- Any change to the Calendar budget-spent widget or Analytics budget totals (verified independent of this feature).
- Cleaning up orphaned `expenses` array data already in the database.

## Implementation Notes
- Files created/modified:
  - `src/app/trips/[id]/TripDetailClient.tsx` — removed `expenses` tab entry, `ExpensesPanel` render block, `ExpensesPanel`/`Wallet` imports (both were dead after removal, `Wallet` had no other use in the file).
  - `src/components/index.ts` — removed `ExpensesPanel` barrel export.
  - `src/lib/index.ts` — removed `LocalExpense`/`tempId`/`buildLocal`/`applyRates`/`toApiExpenses` barrel exports (`tempId` was in the same file but not listed in the brief — confirmed unused anywhere else before removing).
  - `src/services/index.ts` — removed `saveExpenses` barrel export.
  - `src/services/trips.service.ts` — updated a stale comment on `updateTrip()` that referenced `ExpensesPanel`'s now-removed `Promise.all` usage as a rationale example; no behavior change.
  - `src/models/Trip.ts` — removed `IExpense` interface, `ExpenseSchema`, `expenses` field on `ITrip`/schema, and its mapping in `formatTrip`.
  - `src/types/trip.ts` — removed `TripExpense` interface and `expenses?` field on `Trip`.
  - `swagger.yaml` — removed the `/api/trips/{id}/expenses` path entirely (no separate schema component existed for it to clean up).
  - Deleted: `src/components/ExpensesPanel/` (folder), `src/lib/expenses.ts`, `src/services/expenses.service.ts`, `src/app/api/trips/[id]/expenses/route.ts`.
- Deviations from task requirements: none.
- New design tokens used: none (pure removal).

Verification: `tsc --noEmit` clean (after clearing a stale `.next` types cache referencing the deleted route file), `eslint` on all touched files shows only 4 pre-existing errors in `TripDetailClient.tsx` at lines untouched by this change (confirmed via `git diff --stat` — this file only had deletions, no additions), `next build` succeeds and `/api/trips/[id]/expenses` no longer appears in the route list. Calendar and Analytics untouched, as scoped.
