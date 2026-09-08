# Task: Seasonal hours — collapse uniform daily hours in read-mode; decouple Opening Months from seasonalHours storage

Status: done
Track: B
Track reason: extends an existing display pattern (getUniformHoursLabel, already used for base hours) to seasonal tabs, plus a data-flow correction — no new UI surface

## Problem
Two related issues in seasonal hours:
1. Read-mode always renders a full 7-row day-by-day table for the active seasonal tab,
   even when that tab's hours are identical every day (e.g. "open daily 7:00–17:00") — the
   base (non-seasonal) hours already collapse to a single line in this case via
   `getUniformHoursLabel`, but seasonal tabs never got the same treatment.
2. Whenever seasonalHours are used, the editor derives and PERSISTS a restricted
   `openingMonths` value (the union of the seasonal entries' date ranges) via
   `deriveOpeningMonthsFromSeasonalHours`. This conflates two different things: the stored
   `openingMonths` field should just mean "year-round" once seasonalHours exist (the real
   month-by-month story lives entirely in seasonalHours), and "which months are actually
   open" should be a live, display-only computation, not a separately persisted value.

## Goal
1. A seasonal tab with the same hours every day shows one collapsed line, not 7 rows.
2. `openingMonths` is always saved as year-round (undefined) once seasonalHours are used.
   Anywhere that needs "which months are open" (status chip, calendar out-of-season alert,
   editor helper text) derives it live from seasonalHours instead of reading the stored
   `openingMonths`.

## Requirements
- `AttractionDetailModal.tsx`: compute `getUniformHoursLabel` for the active seasonal tab's
  `effectiveOpeningHours`; render the collapsed single line instead of the day table when
  present, same treatment the base hours already get
- `NewAttractionModal.tsx`'s `handleSave`: `openingMonths` is `undefined` whenever
  `completeSeasonalHours.length > 0`, not the derived restricted array
- `deriveOpeningMonthsFromSeasonalHours` (`src/lib/seasonalHours.ts`): exclude any entry
  whose own `hours` are entirely closed (e.g. an explicit "closed this season" entry) from
  the derived open-months union — those ranges aren't actually open
- `getStatusChips` (`src/lib/attractionStatusChips.ts`): when `seasonalHours` is present,
  derive the "seasonal" (which-months) chip from `deriveOpeningMonthsFromSeasonalHours`
  instead of the raw `openingMonths` parameter — self-heals any attraction saved before
  this fix, not just newly-saved ones
- `getOutOfSeasonAlert` (`src/app/trips/[id]/CalendarSection.utils.ts`): same
  derive-from-seasonalHours-when-present fix — otherwise this alert would silently stop
  firing for any seasonal-hours attraction once `openingMonths` is always year-round

## Constraints
- Editor's existing "Derived from your Seasonal Hours ranges below: open {months}" helper
  text was already display-only (never itself persisted) — no change needed there beyond
  benefiting from the closed-entry-exclusion fix in the shared derive function
- Don't change `resolveOpeningHoursForDate`'s own logic — it already correctly treats
  seasonalHours as authoritative once present

## Out of scope
- Any change to how seasonal hours entries themselves are created/edited

## Implementation Notes
- Files created/modified:
  - src/components/AttractionDetailModal/AttractionDetailModal.tsx (new `activeHoursUniformLabel` computed via getUniformHoursLabel for the active seasonal tab; hoursCard now renders that single line instead of the 7-row table when present)
  - src/components/AttractionDetailModal/AttractionDetailModal.module.css (new `.hoursUniform` style, matching a single `.hoursRow`'s padding/weight)
  - src/components/NewAttractionModal/NewAttractionModal.tsx (handleSave: openingMonths is always undefined when seasonalHours are used, not the derived restricted array; updated doc comments)
  - src/lib/seasonalHours.ts (deriveOpeningMonthsFromSeasonalHours now excludes entries whose own hours are entirely closed via isPermanentlyClosed)
  - src/lib/attractionStatusChips.ts (the "seasonal" chip derives months from seasonalHours via deriveOpeningMonthsFromSeasonalHours when present, instead of the raw openingMonths param — self-heals pre-existing attractions saved before this fix too)
  - src/app/trips/[id]/CalendarSection.utils.ts (getOutOfSeasonAlert same derive-from-seasonalHours fix, otherwise this alert would have silently stopped firing for any seasonal-hours attraction once openingMonths always reads year-round)
- Deviations from task requirements: none
- New design tokens used: none — .hoursUniform reuses existing spacing/color/weight tokens matching .hoursRow
- Verification: tsc clean; eslint identical to pre-existing baseline (confirmed no new issues); live-verified against the real "Wielka Krokiew Ski Jumping Hill" attraction (8 seasonal entries, all uniform-per-day) — Jan tab now shows "Every day: 09:00 – 15:00" as one line instead of 7 identical rows, and no misleading "Open X months" chip appears since its seasonal entries collectively cover the full year

## Completion Summary
Seasonal-hours tabs now collapse uniform daily hours to one line in read-mode, and openingMonths is always stored as year-round once seasonalHours are used, with "which months are open" derived live from seasonalHours everywhere it's displayed (status chip, calendar alert, editor helper text). Verified live against a real attraction. Confirmed by the user 2026-09-08.
