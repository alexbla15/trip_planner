Status: done
Track: B

## Completion Summary
Confirmed by user 2026-09-12.

## Request
.AttractionDetailModal-module_childrenList - two columns, width 100%

## Problem
`.childrenList` (the expandable list of contained places under a parent attraction,
e.g. a mall's shops) was a single-column block. User wants it laid out as two
columns spanning the full width.

## Fix
`src/components/AttractionDetailModal/AttractionDetailModal.module.css`: added
`display: grid; grid-template-columns: repeat(2, 1fr); width: 100%;` to
`.childrenList`.

## Implementation Notes
- `tsc --noEmit -p .`: clean (CSS-only change).
- Verified live via Playwright against `npm run dev`: opened an attraction detail
  modal and injected synthetic child rows into a `.childrenList` element (no
  real attraction with children was available to browse to), confirmed via
  `getComputedStyle` that `display: grid`, `gridTemplateColumns: 170px 170px`
  (two equal columns), `width: 342px` (full container width). Screenshot
  confirmed the two-column visual layout.
