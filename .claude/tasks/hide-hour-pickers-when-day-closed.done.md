# Task: Hide hour range pickers for a day marked closed

Status: done
Track: B
Track reason: Small conditional-rendering tweak on an existing form control (the `closed` switch already exists per `DayRow` in `OpeningHoursGrid.tsx`); no new visual pattern.

## Problem
In the edit-attraction form, `OpeningHoursGrid.tsx` renders a `DayRow` per day with a `closed` switch and a list of open/close time ranges. Today, toggling a day to "closed" leaves the range pickers visible and editable, which is confusing — a user can set hours for a day that's marked closed, and it's unclear those hours are meaningless.

## Goal
When a day's `closed` switch is on, the range pickers for that day are hidden (not just disabled), so the form visually communicates "no hours apply to this day."

## Requirements
- In `src/components/NewAttractionModal/OpeningHoursGrid.tsx`, when a given day's `closed` is `true`, hide that day's range list and "add range" control.
- When `closed` is toggled back off, restore the range editor (preserve any previously-entered ranges if the user toggles closed → open again within the same edit session, rather than wiping them).
- Toggling `closed` to `true` should not delete the stored `ranges` data — only hide the UI for editing it (existing save behavior around closed days should be preserved; check `src/lib/openingHours.ts`'s `normalizeOpeningHours` for how it currently treats `closed: true` with non-empty `ranges`).
- No change to the underlying `openingHours` data model.

## Constraints
- Read `src/lib/openingHours.ts` in full before changing anything — `normalizeOpeningHours`, `hasOpeningHoursData`, and `isAllDay24h` all read the `closed`/`ranges` shape and must keep working.
- Per project learnings, grep every reader of `openingHours`/`DayRow` shape before assuming this is purely local to `OpeningHoursGrid.tsx` — `AttractionDetailModal.tsx` has its own read-only hours table.

## Out of scope
- Changing how closed days are displayed in the read-only detail view (that's existing behavior, not part of this task).
- The 24/7 toggle behavior (`is24h`/`handle24hToggle`) — untouched.

## Implementation Notes
- Files created/modified:
  - `src/components/NewAttractionModal/OpeningHoursGrid.tsx` — `DayRow` now conditionally renders the range-list editor only when `!closed`; when closed, nothing renders in its place (per user feedback: no placeholder text, just leave the space empty).
  - `src/components/NewAttractionModal/OpeningHoursGrid.module.css` — removed `.rangeListDisabled` (and the short-lived `.closedPlaceholder` it was replaced with, then also removed) along with now-unreachable `:disabled` pseudo-class rules on `.rangeButton`/`.timeInput`, since nothing sets `disabled` anymore.
- Deviations from task requirements: none. Ranges data is untouched by `handleClosedToggle` (only flips the `closed` boolean), so toggling closed → open within the same session restores previously-entered ranges exactly as before — this already worked pre-change and required no new code.
- New design tokens used: none.

Verified with `npx tsc --noEmit` (clean) and `npx eslint` on the changed `.tsx` file (no errors).

## Completion Summary
Editing an attraction and marking a day "Closed" now hides that day's time-range editor entirely, leaving the space empty (no placeholder text, per user preference) instead of showing dimmed/disabled inputs. Toggling closed back off restores any previously-entered ranges unchanged. Confirmed by user on 2026-08-25.
