Status: done
Track: B

## Completion Summary
Confirmed by user 2026-09-30.

## Request
Alerts should be visible in all modes (not just Edit mode).

## Problem
The trip page defaults to read-only view mode even for the owner (a separate
toggle from actual edit permission). `CalendarSection` only computed alerts
when its `canEdit` prop was true, but that prop is `effectiveCanEdit = canEdit
&& viewMode === "edit"` — so alerts (and the alert-type filter chips) were
invisible by default until the user manually switched to Edit mode, which
looked like "the alert buttons don't show" since nothing indicated they were
mode-gated.

## Fix
`src/app/trips/[id]/CalendarSection.tsx`: added a `hasEditPermission` prop
(defaults to `canEdit` for callers that don't split the two), representing
true owner/collaborator permission regardless of the read-only/edit toggle.
Alert computation now uses `hasEditPermission` instead of `canEdit` — alerts
are informational, not an editing action, so they should be visible whenever
the viewer *could* edit, not only while actively in edit mode. Scheduling
actions (the sidebar, drag-to-schedule, the time-edit popup) are unaffected,
still gated on `canEdit`/`effectiveCanEdit` as before.
`src/app/trips/[id]/TripDetailClient.tsx`: passes `hasEditPermission={canEdit}`
(the raw permission) alongside the existing `canEdit={effectiveCanEdit}`.

## Implementation Notes
- `tsc --noEmit`: clean.
- Verified live via Playwright: seeded a trip with an overlap, opened it as
  the owner WITHOUT switching to edit mode (confirmed "Read-only" badge
  still showing) — the overlap alert banner rendered correctly. Cleaned up
  the test trip after.
