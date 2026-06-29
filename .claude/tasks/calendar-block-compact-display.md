# Task: Calendar Block Compact Display for Short Attractions

Status: reviewing

Track: B
Track reason: CSS + minor TSX tweak only — no new component or design surface; fixes existing block layout

## Problem
Two related display issues on the calendar timeline:
1. The planned time (`HH:MM`) is not visible on small attraction blocks — it overflows or is clipped by the block's `overflow: hidden`
2. When an attraction duration is less than ~1 hour (block height < 60px), the time and name stack vertically and neither is fully readable — they need to be on the same line

## Goal
Every calendar block is readable regardless of its size: short blocks show icon, time, and name on one horizontal line; normal blocks keep their current two-line layout.

## Requirements

### Compact mode (block height < SLOT_HEIGHT_PX, i.e. < 1 hour)
- Icon (optional) + planned time + attraction name all on **one line**
- Text truncated with ellipsis if it overflows the block width
- Apply a `.blockCompact` CSS modifier class when `cardPx(a) < SLOT_HEIGHT_PX`

### Normal mode (block height ≥ SLOT_HEIGHT_PX)
- Existing layout is preserved: `[icon] [time]` on the top row, name below
- No change needed for normal blocks

### Time visibility
- The time label must always be visible and not clipped — the block should use `overflow: hidden` with `text-overflow: ellipsis` rather than completely hiding the time
- Minimum readable font size: 9px (existing) is acceptable for the time label

## Implementation
- In `CalendarSection.tsx`, add `.blockCompact` class to the attractionBlock `div` when `cardPx(a) < SLOT_HEIGHT_PX`
- In `CalendarSection.module.css`, add `.blockCompact` modifier rules that change the flex layout inside the block to a single row

## Constraints
- CSS Modules only — edit only `CalendarSection.module.css` and `CalendarSection.tsx`
- `SLOT_HEIGHT_PX` is imported from `@/config/ui`
- No new components

## Out of scope
- Changing block colors or icons
- Touch/drag interactions


## Implementation Notes
- Files modified: `src/app/trips/[id]/CalendarSection.tsx`, `src/app/trips/[id]/CalendarSection.module.css`
- Deviations from brief: used the already-computed `height` variable (= cardPx(a)) directly in the class condition rather than calling cardPx(a) again — same result, avoids double computation
- New design tokens used: none
