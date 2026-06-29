# Task: Calendar Attraction Blocks Lack Visual Separation

Status: done

Track: B
Track reason: small UI styling tweak — border/outline on existing element; no new component or interaction

## Problem
When multiple attraction blocks are placed close together on the calendar timeline (e.g., back-to-back time slots), they appear to merge into one visual mass. There is no border or gap that makes each block clearly distinct.

## Goal
Each attraction block on the calendar is visually distinct from adjacent blocks, even when they sit immediately next to each other.

## Requirements
- Add a visible border to `.attractionBlock` in `src/app/trips/[id]/CalendarSection.module.css`
  - Use `border: 1.5px solid rgba(255,255,255,0.35)` (semi-transparent white — works on all the type-color backgrounds) 
  - Also try `outline: 1.5px solid rgba(255,255,255,0.35)` if border collapses with neighbours — outline doesn't affect layout
- Add a `gap` or `padding` adjustment on the untimed section cards (`.untimedCard`) if they also look merged — same border treatment
- Ensure the border doesn't break the existing `--block-color` background or text contrast
- No changes to JS/TSX

## Constraints
- CSS Modules only — edit only `CalendarSection.module.css`
- Preserve the existing `--block-color` CSS custom property on each block (type-colored backgrounds)
- Do not change card width/height calculations in the TSX

## Out of scope
- Changing the color scheme or type-color palette
- Adding shadows (use border/outline only, shadows may look noisy when blocks are dense)

## Implementation Notes
- Files modified: `src/app/trips/[id]/CalendarSection.module.css`
- Deviations from task requirements: none — changed `border: none` to `border: 1.5px solid rgba(255,255,255,0.35)` on `.attractionBlock`. Untimed cards already had `border: 1px solid var(--color-border-subtle)` and `gap: 4px` between them, so no change needed there.
- New design tokens used: none


## Completion Summary
Styling fix: changed border: none to border: 1.5px solid rgba(255,255,255,0.35) on .attractionBlock in CalendarSection.module.css. Timed calendar blocks now have a visible white border separating them when adjacent. Confirmed by user 2026-06-29.
