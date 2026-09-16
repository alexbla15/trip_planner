Status: done
Track: B

## Completion Summary
Confirmed by user 2026-09-16.

## Request
Bad phone design of children in attraction card, especially when a child has
a long name.

## Problem
`.grid` in ExploreClient.module.css (the Explore page's card grid) had no
`align-items` set, so CSS Grid's default `stretch` applied: when a card's
expanded children list made it taller than its row-neighbor (e.g. a long
child name wrapping to extra lines), the shorter neighbor card got stretched
to match the row height, leaving a large ugly blank gap inside it instead of
sitting at its natural height. This is most visible on narrow phones where
the grid drops to 2 columns (~180-190px cards) and long child names wrap to
multiple lines.

## Fix
`src/app/explore/ExploreClient.module.css`: added `align-items: start` to
`.grid`, so each card keeps its own natural height and the grid rows don't
force shorter cards to stretch.

## Implementation Notes
- `tsc --noEmit`: clean (CSS-only change).
- Verified live via Playwright at a 430px mobile viewport (2-column grid):
  injected synthetic children with a long name into a real card to reproduce
  height mismatch between grid-row neighbors. Before: the shorter neighbor
  card ("Bickentor") stretched to fill the row, showing a large blank gap.
  After: the neighbor keeps its natural height and the next row moves up
  flush beneath it, no dead whitespace.
