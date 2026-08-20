# Task: CalendarSection Decomposition (Dedicated, Incremental)

Status: done
Track: B
Track reason: Pure structural refactor — no new UI surface, no visual change intended.

## Problem
`src/app/trips/[id]/CalendarSection.tsx` (~1100 lines) is the last unresolved item from the `/qc` architecture cleanup goal. Two prior follow-up tasks (`qc-page-decomposition-followup`, `qc-calendar-admin-decomposition-followup`) both read into it and stopped short of extracting anything, because an "extract the whole day-column/sidebar in one pass" attempt has no clean boundary — its state (local attractions, a pending-changes map, popup state, dismissed alerts, day-range, sidebar search/filter, mobile swipe-carousel refs, total spend) is deeply cross-referenced throughout the render.

Trying the same all-or-nothing extraction a third time is unlikely to succeed differently. This task changes the strategy: **go incremental**, starting with the lowest-coupling pieces first, rather than attempting the whole ~500-line block at once.

## Goal
`CalendarSection.tsx` is measurably smaller and better organized, via one or more genuinely low-risk subcomponent extractions — even if the hardest piece (the day-column grid with its position/overlap layout math) ends up staying in the main file because it's judged not safely extractable without a state-architecture change.

## Requirements
- Read `CalendarSection.tsx` and `CalendarSection.utils.ts` in full (all ~1100 + utils lines) before extracting anything.
- Identify and extract candidates in order of increasing coupling, stopping whenever the next one no longer looks safe:
  1. **Alert banner list** (the `visibleAlerts.map(...)` block) — takes `alerts` + a dismiss callback, no other state needed. Likely the safest first extraction.
  2. **Sidebar attraction card / group** (the `sidebarGroups` render) — takes one group's `instances`, plus whatever callbacks it fires (assign/unassign/edit), but doesn't need `pending`, `dayStart`/`dayEnd`, or the map widget state.
  3. **Empty state** — already nearly standalone, trivial extraction.
  4. **Day-column grid** (the actual calendar timeline with positioned cards) — only attempt this if 1–3 went cleanly and gave enough confidence in the pattern; this is the piece most likely to need a state-architecture change (e.g. consolidating scattered state into a `useCalendarSchedule`-style hook) rather than a pure JSX split. If so, stop and document the specific reducer/hook shape that would be needed, rather than attempting the architecture change in this same task.
- For each successful extraction: manually exercise the calendar in a real browser (assign/unassign an attraction, dismiss an alert, toggle sidebar filters, open the map) before moving to the next one.
- Follow existing project conventions: extracted pieces live either as sibling files in `src/app/trips/[id]/` (page-local, matching the existing `Header` sub-component precedent already in this file) or as their own component subfolder under `src/components/` if genuinely reusable elsewhere — pick page-local unless there's a second real consumer.

## Constraints
- Zero behavior/visual change for anything actually extracted.
- It's a fully acceptable outcome to extract only 1–2 of the 4 candidates and leave the rest with clear written reasoning — do not force the day-column grid extraction if it still doesn't have a clean seam. Two prior tasks already documented that forcing it is the wrong move.
- Verify with `tsc`/`eslint` plus live dev-server checks (per `docs/LEARNINGS.md` — static checks alone don't prove no UI regression). If a `next dev` process is live, a restart is a normal low-risk recovery step if it crashes mid-check, not evidence of a real bug — but always verify via `tsc`/`eslint` first before concluding a crash is infra, not code.
- If using `git stash` to diff against a pre-change baseline, scope it to specific files (`git stash push -- <paths>`) rather than the whole working tree, and always diff `git diff HEAD` against `git stash show -p` before dropping the stash to confirm nothing was lost — see `docs/LEARNINGS.md`'s entry on a near-miss here.

## Out of scope
- No new features, fields, or visual redesign.
- Not attempting a state-architecture change (context/reducer) for the day-column grid in this task — if needed, document it as a further follow-up instead.
- Not re-touching `AdminClient.tsx`, `TripDetailsForm`, `NewTripClient.tsx`, or `EditTripClient.tsx` (already done in prior closed tasks).

## Implementation Notes

**Completed: 3 of 4 candidates extracted (candidate 4, the day-column grid, deliberately left in place — see below).**

- Read `CalendarSection.tsx` (1105 lines) and `CalendarSection.utils.ts` in full before extracting anything.
- **1. `ScheduleAlertList`** (`src/app/trips/[id]/ScheduleAlertList.tsx`) — takes `alerts` + `onDismiss`, renders the dismissible warning banners. Zero coupling to the rest of the component's state.
- **2. `SidebarAttractionCard`** (`src/app/trips/[id]/SidebarAttractionCard.tsx`) — takes one group's `instances`, `days`, `canEdit`, a pre-resolved `icon`/`color` (computed by the parent via `findType`/`colorForType`, kept out of the subcomponent to keep it purely presentational), and the three callbacks (`onAssign`/`onUnassign`/`onDuplicate`). Ports both the single-instance and multi-instance branches verbatim, just parameterized.
- **3. `CalendarEmptyState`** (`src/app/trips/[id]/CalendarEmptyState.tsx`) — trivial, takes `canEdit`.
- All three are page-local siblings (not in `@/components`), matching the existing `Header` sub-component precedent already in this file — they're tightly coupled to `CalendarSection.module.css` and have no second consumer.
- File size: `CalendarSection.tsx` went from 1105 → 972 lines (~12% reduction).

**Not implemented: candidate 4, the day-column grid** (the actual calendar timeline with positioned/overlapping attraction blocks, spillover-to-next-day handling, and the mobile swipe carousel). Confirmed via full read that it needs `local`, `pending`, `dayStart`/`dayEnd`, `hourSlots`, `colorForType`/`findType`, five different click/edit handlers, and the swipe-carousel refs/state all at once — there's no subset of that which forms a clean, independently-testable boundary the way the other three did. Forcing a split here would mean either a large prop-drilled API or an actual state-architecture change (e.g. consolidating into a `useCalendarSchedule` hook), both of which are out of scope for a zero-behavior-change pass per this task's own constraints. This appears to be a genuine architectural limit of the current design, not something a fourth attempt at "just extract the JSX" is likely to resolve — a future task should scope specifically around introducing that consolidating hook/reducer first, as a separate step from the JSX split.

**Verification:** `npx tsc --noEmit` clean. `npx eslint` on all 4 touched/created files: the 3 new files are 100% clean; `CalendarSection.tsx` itself has 4 pre-existing `react-hooks/set-state-in-effect`/`react-hooks/refs` errors, confirmed present at baseline via a scoped `git stash push -- <path>` comparison (per this task's own guidance, using a scoped stash rather than the whole tree — completed cleanly within the tool timeout this time). Live-verified: `/trips/x` (with a placeholder id) returns 200 with no error markers in the response body.
- **Limitation, stated plainly:** this environment has no valid login credentials or real trip data, so the placeholder-id route hits the app's own "trip not found" handling before `CalendarSection` actually mounts — meaning the requirement to "manually exercise the flow in a real browser (assign/unassign, dismiss alert, toggle filters)" could only be partially satisfied (compile/render-error-free confirmed; the actual interactive behaviors were not exercised end-to-end). Recommend the user do a quick manual pass on a real trip with attractions before considering this fully verified.

No API routes changed, so `swagger.yaml` was not touched.

## Completion Summary
Closed by user decision (2026-08-20): 3 of 4 candidate extractions completed (ScheduleAlertList, SidebarAttractionCard, CalendarEmptyState), shrinking CalendarSection.tsx from 1105 to 972 lines. The day-column grid was left untouched after three separate tasks independently confirmed it has no safe extraction boundary without a state-architecture change — documented as a deliberate, well-understood gap rather than an oversight. User accepted the stated verification limitation (no real login credentials available to interactively test assign/unassign/dismiss-alert in this environment) and will do their own manual pass on a real trip. This closes the /qc architecture cleanup goal's full page-decomposition thread across all 4 tasks.
