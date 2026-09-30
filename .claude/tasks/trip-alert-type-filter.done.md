Status: done
Track: A (small feature, existing pattern reused)

## Completion Summary
Confirmed by user 2026-09-30.

## Request
Add an alerts filter like "show or unshow overlap in time" in trips/[id].

## Context
The trip calendar (CalendarSection.tsx) already computes 4 alert types via
computeAlerts/CalendarSection.utils.ts: "conflict" (time overlap — literally
messaged as "... overlap in time"), "closed", "season", "overflow". All 4
render identically with no way to show/hide by type. User confirmed (via
AskUserQuestion) they want filtering by all 4 types, not just overlap.

## Implementation
- `src/app/trips/[id]/CalendarSection.tsx`: added `hiddenAlertTypes` state
  (`Set<AlertType>`), a `presentAlertTypes` derived list (only types actually
  occurring in the current alert set, so the filter row doesn't show empty
  chips), and a toggle-chip group (reusing the existing `.filterChips`/
  `.filterChip`/`.filterChipActive` sidebar-filter pattern) rendered above
  `ScheduleAlertList`, only when 2+ distinct alert types are present. Each
  chip shows a count and toggles that type in/out of `visibleAlerts`.
  "conflict" is labeled "Overlap" to match its message text.
- `src/app/trips/[id]/CalendarSection.module.css`: added `.alertTypeFilter`
  (margin-bottom) since this usage sits directly in `.card`, not inside the
  sidebar's flex-gap container the original chips rely on for spacing.

## Implementation Notes
- `tsc --noEmit`: clean.
- Filter state is in-memory only (`useState`), matching the existing
  `dismissedAlerts`/sidebar `filter` state — no persistence layer exists on
  this page to hook into.
