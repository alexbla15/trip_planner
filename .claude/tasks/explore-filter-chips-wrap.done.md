# Task: Explore Filter Chips Allow Wrapping

Status: done

Track: B
Track reason: CSS-only fix — change overflow-x: auto to flex-wrap: wrap on the filter row container

## Problem
The Explore page mood-filter chip row has `overflow-x: auto` and each chip has `white-space: nowrap`, so the row scrolls horizontally. With 12 tags now in the list, the full set is not visible at once and there is no affordance that more chips are hidden. Users miss tags that are off-screen.

## Goal
All mood filter chips are visible at once by wrapping onto multiple rows, with no horizontal scrolling.

## Requirements
- Change `.filtersRow` in `src/components/ExploreSection/ExploreSection.module.css`:
  - Remove `overflow-x: auto` and `-webkit-overflow-scrolling: touch`
  - Remove the `::-webkit-scrollbar` rule that was added for the scrollable row
  - Add `flex-wrap: wrap`
  - Add `gap: 8px` (or keep the existing gap if one already exists)
- Keep `white-space: nowrap` on `.filterChip` — each chip stays on one line internally, but chips wrap to the next row as a unit
- No changes to TSX

## Constraints
- Edit only `src/components/ExploreSection/ExploreSection.module.css`
- No new components or JS changes

## Out of scope
- Changing chip size, shape, or color
- Mobile-specific layout (wrapping works correctly on all screen sizes)

## Implementation Notes
- Files modified: `src/components/ExploreSection/ExploreSection.module.css`
- Deviations from task requirements: also removed `scrollbar-width: none` and `padding-bottom: 4px` (scroll-specific leftovers with no purpose after the scrollable layout was removed)
- New design tokens used: none


## Completion Summary
Filter chips in the Explore page now wrap onto multiple rows instead of scrolling horizontally. Removed scroll-related CSS (overflow-x, webkit-scrolling, scrollbar rules, padding-bottom) and added flex-wrap: wrap to .filtersRow. Confirmed by user 2026-06-29.
