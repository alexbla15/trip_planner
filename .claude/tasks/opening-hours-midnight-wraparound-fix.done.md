# Task: Fix midnight-wraparound bug in opening-hours conflict check

Status: done
Track: B
Track reason: pure logic bug fix in an existing function, no visual/UI change

## Problem
`getClosedAlert` in `src/app/trips/[id]/CalendarSection.utils.ts` (lines 34-61) flags attractions as "closed" incorrectly whenever their opening hours span midnight (e.g. `open: "18:00"`, `close: "03:00"`). The check does `planned < open || planned >= close` using raw minutes-since-midnight with no wraparound handling. Example: "MacLaren's Pub" (18:00–03:00) scheduled at 21:00 gets flagged as "scheduled at 21:00 but opens 18:00–03:00" even though 21:00 is well within that range. This produces false-positive alerts for any venue with overnight hours (bars, clubs, 24h-adjacent venues).

## Goal
`getClosedAlert` correctly treats a day where `close < open` as an overnight range (open today, closes after midnight) and does not flag valid overnight-range times as closed.

## Requirements
- When `close < open` for a day's hours, treat the open window as `[open, 24:00) ∪ [00:00, close)` and only flag `planned` as closed if it falls strictly between `close` and `open` (i.e. outside both segments).
- Same-day ranges (`open < close`, the common case) keep their existing behavior — no regression there.
- Keep `attractionEndMins` (the separate, intentionally-not-shared helper in the same file) untouched — it is unrelated to this bug per prior team note in the file comments.
- Add/update a check for the exact repro case: `open: "18:00"`, `close: "03:00"`, `planned: "21:00"` → no closed alert.

## Constraints
- Fix must live in `getClosedAlert` only; do not touch `computeAlerts`'s call site signature or other alert types (conflict/overflow).
- Do not change the `OpeningHoursDay`/`OpeningHours` type shape in this task — that's covered by [[multi-range-opening-hours]].

## Out of scope
- Supporting multiple opening-hours ranges per day (separate task).
- Any UI display of opening hours.

## Implementation Notes
- Files created/modified: `src/app/trips/[id]/CalendarSection.utils.ts` (`getClosedAlert`)
- Deviations from task requirements: none. Repro case (18:00–03:00, planned 21:00) verified by manual trace; no automated test added since the repo has no test runner configured (no `test` script in `package.json`, no existing `.test.ts` files).
- New design tokens used: none (logic-only change)

## Completion Summary
Fixed `getClosedAlert` in `src/app/trips/[id]/CalendarSection.utils.ts` to correctly treat opening-hours ranges spanning midnight (e.g. 18:00–03:00) as overnight ranges, instead of comparing planned time against a same-day-only window. This eliminated false-positive "closed" alerts for venues like "MacLaren's Pub" scheduled well within their true open hours. Confirmed by the user and closed 2026-08-20.
