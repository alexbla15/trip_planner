# Task: Default trips/[id] to read-only mode

Status: done
Track: B
Track reason: flips an existing toggle's default state, no new UI or design decision (the edit/read-only toggle itself already shipped in `trip-detail-edit-readonly-toggle.done.md`).

## Problem
`trips/[id]` currently defaults owners/collaborators into "Edit mode" (`viewMode` initial state `"edit"` in `TripDetailClient.tsx`), per the original toggle task. This means every visit to a trip starts in an editable state, risking accidental edits.

## Goal
Owners/collaborators land on `trips/[id]` in "Read-only" mode by default; they can still switch to "Edit mode" via the existing toggle whenever they want to make changes.

## Requirements
- Change the initial `viewMode` state in `TripDetailClient.tsx` from `"edit"` to `"readonly"`.
- All existing gating (`effectiveCanEdit = canEdit && viewMode === "edit"`) stays unchanged — this is a default-value change only.
- Non-owners/non-collaborators are unaffected (they were already always read-only).

## Constraints
- Do not change the toggle's mechanics, placement, or the underlying `canEdit` role check.

## Out of scope
- Persisting the user's last-chosen mode across sessions/trips.

## Implementation Notes
- Files created/modified: `src/app/trips/[id]/TripDetailClient.tsx` — changed `useState<"edit" | "readonly">("edit")` to `useState<"edit" | "readonly">("readonly")` for `viewMode`.
- Deviations from task requirements: none.
- New design tokens used: none.

## Completion Summary
Owners/collaborators now land on trips/[id] in read-only mode by default and can switch to Edit mode via the existing toggle. Closed 2026-08-26.
