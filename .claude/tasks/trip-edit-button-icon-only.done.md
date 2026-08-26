# Task: Make "Edit trip" button icon-only on trips/[id]

Status: done
Track: B
Track reason: shrinking an existing button to icon-only, no new visual pattern — existing icon-only buttons already exist elsewhere in the app to match.

## Problem
The "Edit trip" link/button on `trips/[id]` (`TripDetailClient.tsx`) shows an icon + text label, taking up more space than needed, especially on mobile.

## Goal
The "Edit trip" control on `trips/[id]` renders as an icon-only button (its existing pencil/`PenLine` icon, no visible text label), while remaining fully accessible.

## Requirements
- Remove the visible text label from the "Edit trip" button/link, keep the icon.
- Add an `aria-label="Edit trip"` (or equivalent) so it remains accessible to screen readers.
- Preserve its existing click behavior (navigates to `trips/[id]/edit`) and its existing gating (`effectiveCanEdit`, per `trip-detail-edit-readonly-toggle.done.md`).
- Match the icon-button sizing/style already used elsewhere in this codebase (e.g. per-row edit/delete icon buttons) for visual consistency.

## Constraints
- Do not change what the button does or when it's shown — purely a visual/markup change.

## Out of scope
- Changing any other buttons on the page.

## Implementation Notes
- Files created/modified: `src/app/trips/[id]/TripDetailClient.tsx` — removed the "Edit trip" text label from the `.cardEditLink`, added `aria-label="Edit trip"`, kept the `PenLine` icon.
- Deviations from task requirements: no CSS changes needed — `.cardEditLink` was already a plain inline-flex link with `gap`/`flex-shrink: 0`, so it collapses cleanly to icon-only without adjustment.
- New design tokens used: none.

## Completion Summary
"Edit trip" on trips/[id] is now icon-only (PenLine icon) with an accessible label, same click behavior and edit-mode gating as before. Closed 2026-08-26.
