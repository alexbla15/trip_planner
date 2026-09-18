Status: done
Track: B

## Completion Summary
Confirmed by user 2026-09-18.

## Request
Too long names in attraction card title on phone are going under the buttons.

## Problem
`AttractionDetailModal.module.css`'s `.title` (the `<h2>` inside `.headerTitle`,
a nested flex row) had no `min-width: 0`. In a flex row, a text child defaults
to its content's intrinsic width as a shrink floor unless explicitly told it
can shrink below that — so a long unbroken title couldn't actually wrap/shrink
to the space left by the header's icon buttons (website/verified/close), and
overflowed underneath them instead.

## Fix
`src/components/AttractionDetailModal/AttractionDetailModal.module.css`:
added `min-width: 0` to `.title`, letting it shrink within the flex row so
`overflow-wrap: break-word` (already present) actually wraps long titles
onto multiple lines instead of overflowing under the header buttons.

## Implementation Notes
- `tsc --noEmit`: clean (single CSS property).
- Verified live via Playwright at a 390px mobile viewport: injected a very
  long title into a real attraction's detail modal, confirmed via
  `getBoundingClientRect()` that the title's right edge no longer overlaps
  the header actions' left edge (298px vs 310px), and confirmed visually via
  screenshot that the title wraps across multiple lines cleanly with the
  close button unobstructed.
