Status: done
Track: B

## Completion Summary
Confirmed by user 2026-09-12.

## Request
children pagination should be in the row below the attractions in the children list

## Problem
After making `.childrenList` a 2-column grid, `.childrenPagination` (and
`.childrenLoading`) had no `grid-column` set, so they'd land in whichever
column the grid's auto-placement put them in (sharing a row with the last
item) instead of sitting in their own full-width row below all the items.

## Fix
`src/components/AttractionDetailModal/AttractionDetailModal.module.css`:
added `grid-column: 1 / -1` to `.childrenPagination` and `.childrenLoading`
so both span the full grid width and always occupy their own row. Also added
a `border-top` to `.childrenPagination` to visually separate it from the
item rows above.

## Implementation Notes
- `tsc --noEmit -p .`: clean (CSS-only change).
- Verified live via Playwright: injected a synthetic `.childrenList` with 5
  `.childRow` items followed by `.childrenPagination`, confirmed via
  `getComputedStyle`/`getBoundingClientRect` that the pagination element has
  `gridColumn: 1 / -1`, spans the full container width (340px of 342px), and
  sits at/below the bottom edge of the last item row (`isBelowAllRows: true`).
