# Task: "Permanently closed" wrongly shown for attractions with seasonal hours

Status: done
Track: B
Track reason: bug fix — broken behavior, no new UI surface

## Problem
`getStatusChips` (`src/lib/attractionStatusChips.ts`) checks `isPermanentlyClosed(openingHours)`
against the base `openingHours` alone, with no awareness of `seasonalHours`. Per this
codebase's own documented convention (`add-attractions/SKILL.md`), once every month of the
year is covered by `seasonalHours` entries, the base `openingHours` is intentionally set to
a neutral all-`closed: true` placeholder — so any attraction with full-year seasonal hours
and no base hours gets wrongly flagged "Permanently closed", even though it has real,
functioning (seasonal) hours. Confirmed live: "Wielka Krokiew Ski Jumping Hill" (Zakopane)
has 8 seasonalHours entries covering the whole year and an all-closed base — showed
"Permanently closed" instead of "Seasonal hours apply".

## Goal
An attraction with seasonalHours never shows "Permanently closed" based on its base hours
alone — matches the same "no default once seasonal hours exist" rule already correctly
implemented in `resolveOpeningHoursForDate` (`src/lib/seasonalHours.ts`).

## Requirements
- `getStatusChips` skips the `isPermanentlyClosed` check entirely when `seasonalHours` is
  non-empty (a genuinely permanently-closed venue wouldn't have populated seasonalHours in
  the first place)

## Constraints
- Don't change `isPermanentlyClosed` itself or any other caller — only where it's checked
  in `getStatusChips`

## Out of scope
- Any other status-chip logic (24/7, seasonal-months chip) — unaffected, already correct

## Implementation Notes
- Files created/modified: src/lib/attractionStatusChips.ts (isPermanentlyClosed check now guarded by `!seasonalHours?.length`)
- Deviations from task requirements: none
- New design tokens used: none
- Verification: tsc clean, eslint clean; live-verified against the real reported attraction (Wielka Krokiew Ski Jumping Hill) — now shows "Seasonal hours apply" instead of "Permanently closed"

## Completion Summary
Fixed getStatusChips to skip the permanently-closed check when seasonalHours exist, matching resolveOpeningHoursForDate's existing rule. Confirmed by the user 2026-09-06.
