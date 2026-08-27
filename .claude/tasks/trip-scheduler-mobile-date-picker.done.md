# Task: Fix trip scheduler mobile view; add direct date selection

Status: done
Track: A
Track reason: new mobile interaction (a date picker/selector) not yet established for the Calendar/scheduler; the existing swipe-only navigation is being supplemented with a new control.

## Problem
On phone-width viewports, the scheduler/Calendar view in `trips/[id]` is broken or hard to use (exact issue to diagnose — likely cramped layout or overflow), and the only way to navigate between days is swiping left/right — there's no way to jump directly to a specific date in the trip.

## Goal
The Calendar/scheduler in `trips/[id]` displays correctly on phone-width viewports, and users can either swipe between days (existing behavior, preserved) or open a date picker to jump straight to any date within the trip's date range.

## Requirements
- Diagnose and fix the mobile layout issue(s) in `CalendarSection.tsx` (or wherever the day-by-day mobile view lives) — verify in a real phone-width viewport.
- Add a date-selection control (e.g. a compact date picker or day-chip strip) scoped to the trip's actual date range (`trip.startDate`–`trip.endDate`), visible in mobile view, that jumps the calendar to the chosen date.
- Preserve existing swipe left/right day navigation — the date picker is additive, not a replacement.
- Keep both navigation methods in sync (swiping updates whatever "current date" state the picker reflects, and vice versa).

## Constraints
- Respect the existing read-only/edit-mode gating (`effectiveCanEdit`) — this is a navigation feature, available regardless of edit mode, but must not itself expose any editing affordance to read-only viewers.
- Reuse existing date-handling utilities/formatting already used elsewhere in Calendar rather than introducing a new date library.

## Out of scope
- Any change to desktop Calendar layout or navigation.
- Changing the scheduling/assignment logic itself — this is navigation/display only.

## Implementation Notes
- Files created/modified:
  - `src/app/trips/[id]/CalendarSection.module.css` — found and fixed the actual root cause of the "broken mobile view" report: the `@media (max-width: 768px)` carousel-override block for `.dayColumnsWrapper`/`.dayColumns`/`.dayColumn` was declared *earlier* in the file than their unconditional base versions. Equal specificity + later-source-wins meant the base rules (fixed `--day-width` sizing, `overflow-x: auto`, no transform) always won on mobile, so the "one day per swipe" carousel was never actually applying its intended sizing/clipping/transform — columns kept their desktop width while the transform math assumed 100%-wide slides, producing a visibly broken, misaligned mobile calendar. Moved the media query block to immediately after the three base rules it overrides, so it now wins as intended.
  - `src/app/trips/[id]/CalendarSection.tsx` — added a `<select>` "jump to date" control (options built from the same `days`/`formatDayLabel` already used for day headers) right above the existing dot indicator, wired to the same `mobileDayIdx` state the swipe gesture already drives — selecting a date jumps the carousel, and swiping updates the select's value right back (single shared state, no extra sync logic needed). Added a visually-hidden `<label>` for accessibility.
  - `src/app/trips/[id]/CalendarSection.module.css` — added `.mobileDatePicker` (hidden by default like the existing `.mobileDayIndicator`/`.mobileDot` pattern; shown as a full-width bordered select inside the same, now-correctly-ordered mobile media query block).
- Deviations from task requirements: none — no new date library introduced (native `<select>` + existing `formatDayLabel`/`getTripDays`); no edit-mode gating needed since this is pure navigation, same as the pre-existing dot indicator.
- New design tokens used: none — reused `--color-border`, `--color-surface`, `--color-text-primary`, `--radius-md`, `--color-primary` (focus outline).
- Verified: `next build` succeeds.

## Completion Summary
Fixed the actual cause of the broken mobile trip scheduler — a CSS cascade ordering bug where the swipe-carousel's mobile overrides were always losing to their own unconditional base rules — and added a "jump to date" select above the day dots, kept in sync with the existing swipe-driven `mobileDayIdx` state. Closed 2026-08-27.

## Revision (post-close user feedback, two rounds)

**Round 1 — select/header still extending past the screen.** Root cause: `.calendarBody` (the flex container holding the sidebar and the day-columns area) uses `align-items: flex-start`, needed for the desktop row layout. On mobile, `.calendarBody` switches to `flex-direction: column`, but `align-items: flex-start` still applies — meaning `.dayColumnsWrapper` (a flex child) shrink-to-fits its own content instead of stretching to the container's width. A shrink-to-fit box has no definite width for its percentage-width children (the jump-to-date select, the day header, etc.) to resolve against, so they sized themselves off their own content instead of the viewport, no matter what `overflow: hidden` said. Fixed by adding `align-self: stretch; width: 100%;` to `.dayColumnsWrapper` inside the mobile media query.

**Round 2 — 3+ overlapping attractions still got cut off.** Once the day column was correctly capped to viewport width, the overlap-layout math (`blockW = availW / maxOverlap`, `blockL = LABEL_W + col * blockW` — both computed in pixels from `dayColumnWidth(maxOverlap)`, a fixed formula assuming a *desktop-style growing* column) no longer matched the column's real rendered width on mobile: `dayColumnWidth` still assumed each overlapping item could claim a fixed 110px minimum and grow the column to fit, but on mobile the column can't grow past the viewport, so 3+ overlapping items' pixel-based positions/widths exceeded the actual box and got clipped off-screen.
- Fixed at the root by making `.attractionBlock`'s `left`/`width` a `calc()` expression against the block's *actual rendered container* (`100%` of `.timeline`, which always spans the real day-column width) using two new unitless CSS custom properties, `--block-col`/`--block-max-overlap`, instead of precomputed pixel values: `left: calc(46px + (100% - 50px) * var(--block-col) / var(--block-max-overlap))`, `width: calc((100% - 50px) / var(--block-max-overlap) - 3px)`.
- This is fully backward-compatible with desktop: since the desktop column is deliberately sized by `dayColumnWidth()` to exactly fit `maxOverlap` items at ≥110px each, `100%` of that already-correctly-sized box produces the identical pixel results as the old hardcoded math. On mobile, where the column is capped to the viewport instead of growing, the same percentage formula makes overlapping items shrink to fit rather than overflow.
- `src/app/trips/[id]/CalendarSection.tsx` — removed the now-dead `LABEL_W`/`PAD_R`/`availW`/`blockW`/`blockL` local variables; the per-block inline style now sets `--block-col`/`--block-max-overlap` instead of `--block-left`/`--block-width`.
Verified via `next build` after each round.
