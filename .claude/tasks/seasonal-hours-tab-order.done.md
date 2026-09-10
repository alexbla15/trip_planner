# Task: Order seasonal opening-hours sections January → December

Status: done
Track: B
Track reason: display-order fix, no new UI surface

## Problem
The read-mode "Opening Hours" tab strip (`AttractionDetailModal.tsx`) rendered seasonal
entries in whatever order they were stored/entered in, not calendar order — a season
entered last (e.g. added as an afterthought) could show up first in the tab strip.

## Goal
Seasonal-hours tabs always read left-to-right in calendar order, January through December,
regardless of entry/storage order.

## Requirements
- New `sortSeasonalHoursByStart` helper (`src/lib/seasonalHours.ts`), exported via `@/lib`
  — sorts a COPY of the entries by start date, never mutates
- `AttractionDetailModal.tsx`'s `hoursTabs` derivation sorts through this helper before
  mapping to tab descriptors

## Constraints
- Must NOT reorder the actual stored `seasonalHours` array or change
  `resolveOpeningHoursForDate`'s overlap-resolution order — that function intentionally
  resolves overlapping ranges by user-entered order ("first match wins"), and re-sorting the
  persisted array would silently change which entry wins for a date two ranges both cover.
  The sort is applied only to the derived, display-only `hoursTabs` list.
- Editor's own "Season 1/2/3..." list is untouched — those labels are positional and tied to
  add/remove/edit operations on the underlying array; reordering just the display there risks
  index-mapping bugs for comparatively little benefit, so left out of scope (see below)

## Out of scope
- Reordering the editor's seasonal-hours entry list
- Any change to overlap-resolution semantics

## Additional change (same session, same area of code)
Also fixed: seasonal-hours attractions never got the "Open 24/7" chip even when genuinely
open 24/7 all year through their seasonal entries, because the chip's `isAllDay24h` check
only ever looked at the base `openingHours` (the neutral all-closed placeholder once
seasonalHours exist). Added `isSeasonalOpen247AllYear` (`src/lib/attractionStatusChips.ts`)
— true when every non-closed seasonal entry is itself all-day-24/7 AND they collectively
cover all 12 months — and `getStatusChips` now branches on it when `seasonalHours` exists,
falling back to the original `isAllDay24h(openingHours)` check otherwise (fully unchanged
for regular attractions).

## Implementation Notes
- Files created/modified:
  - src/lib/seasonalHours.ts (new `sortSeasonalHoursByStart`, display-only sort)
  - src/lib/index.ts (export it)
  - src/components/AttractionDetailModal/AttractionDetailModal.tsx (hoursTabs built from the sorted copy)
  - src/lib/attractionStatusChips.ts (new `isSeasonalOpen247AllYear`; `getStatusChips`'s 24/7 check branches on `seasonalHours`)
- Deviations from task requirements: none
- New design tokens used: none
- Verification: tsc clean, eslint clean (0 new issues, 0 pre-existing in attractionStatusChips.ts/seasonalHours.ts; AttractionDetailModal.tsx's usual pre-existing baseline unaffected). Functionally verified both fixes with `tsx` scripts run directly against the real source: sortSeasonalHoursByStart correctly reorders Nov/Mar/Jan/Jul input into Jan/Mar/Jul/Nov; getStatusChips correctly returns `open-24-7` for a seasonal attraction whose entries are 24/7 and cover the full year, omits it when hours are normal (9-17) or months are restricted (Mar-Oct gap), and leaves regular non-seasonal 24/7 attractions unaffected

## Completion Summary
Seasonal-hours tabs now display in calendar order (Jan-Dec) regardless of entry order, and the "Open 24/7" chip now correctly applies to seasonal-hours attractions that are genuinely open 24/7 all year. Both verified functionally. Confirmed by the user 2026-09-10.
