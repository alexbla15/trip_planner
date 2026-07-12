# Task: Index Page Cleanup

Status: done

Track: B
Track reason: removing elements and a color tweak — all values exist in the design system

## Problem
The index (`/`) page has two issues:
1. Two buttons — "Plan a New Trip" and "Explore Destinations" — are redundant given the navbar and should be removed.
2. The "Plan a New Adventure" card/section appears near the top; it should move to the very end of the page content.
3. In light mode the "Plan a New Adventure" card is not visible enough (contrast too low).

## Goal
A cleaner homepage with the call-to-action card at the bottom and sufficient contrast in light mode.

## Requirements
- Remove "Plan a New Trip" and "Explore Destinations" buttons from the hero/index page
- Move the "Plan a New Adventure" section/card to be the last element on the page
- In light mode, the "Plan a New Adventure" card must meet WCAG AA contrast — adjust background, text, or border color using existing design tokens

## Constraints
- CSS Modules only — no inline styles
- Use only existing design tokens from `docs/DESIGN_SYSTEM.md`

## Out of scope
- Redesigning the card layout or adding new content to it

## Completion Summary
Removed "Plan a New Trip" and "Explore Destinations" hero buttons and their CSS, moved NewTripCard to last in the trips grid, and changed the card icon from `--color-primary-light` to `--color-primary` for sufficient light-mode contrast. Confirmed by user 2026-07-13.

## Implementation Notes
- Files modified: `src/app/page.tsx`, `src/app/page.module.css`, `src/components/NewTripCard/NewTripCard.module.css`
- Deviations from task requirements: none
- New design tokens used: none — icon color changed from `--color-primary-light` to `--color-primary`
