Status: done
Track: B

## Completion Summary
Confirmed by user 2026-09-16.

## Request
Live production report: `/explore?country=Hungary&verified=unverified` shows
3 pages, but page 2 and page 3 look the same, and clicking Next from page 2
never actually reaches page 3 (stuck on page 2).

## Problem
`ExploreClient.tsx`'s column-count/page-size resize effect (added to keep
grid pagination in sync with the CSS grid's actual rendered column count on
browser resize/zoom) measured `el.clientWidth` on `.gridArea`, which has
`overflow-y: auto`. On browsers with classic (non-overlay) scrollbars —
most Windows desktop browsers — `clientWidth` shrinks by the scrollbar's
width whenever the container's content needs vertical scrolling, and grows
back when it doesn't. Different pages have different content heights (a
full page of items vs. a short last page), so simply paginating could
toggle the scrollbar and change `clientWidth` with no real viewport resize.
That falsely re-triggered the effect's "preserve reading position" logic,
which recalculated the page number using the just-navigated page as if it
were the pre-resize anchor — snapping back to a lower page. Reproduced
mathematically with the app's real grid constants (180px card min-width,
16px gap, 20-item floor, 3 rows/page): at a ~1550px+ container width, a
17px scrollbar-width difference crosses a column-count breakpoint (7→8
cols) and the resulting recompute snaps page 3 back to page 2 — matching
the reported symptom exactly.

Not reproducible via headless Playwright directly, because Chromium in this
environment uses overlay scrollbars (`clientWidth` doesn't shrink) —
confirmed by observing `hasVScroll` flip from `true` (pages 1-2) to `false`
(page 3) on the live production page while `clientWidth` stayed constant.

## Fix
`src/app/explore/ExploreClient.tsx`: the resize-effect's `compute()` now
measures `el.getBoundingClientRect().width` instead of `el.clientWidth`.
The border-box width is the element's own box size and isn't affected by
its own scrollbar, so pagination-driven content-height changes no longer
produce a false "resize" signal.

## Implementation Notes
- `tsc --noEmit`: clean (single-line measurement change).
- Verified the failure mode and the fix mathematically (temp Node script
  replicating the exact column/page-size formulas from
  `src/config/ui.ts`): confirmed the old `clientWidth`-based calculation
  produces a page snap-back (3 → 2) at a specific real container width when
  simulating a 17px scrollbar difference between a full page and the short
  last page; confirmed the new `getBoundingClientRect().width`-based
  calculation computes identical column counts regardless of scrollbar
  presence, eliminating the false trigger.
- Live-tested against the reported production URL (Playwright, several
  viewport sizes/auth states) — could not reproduce interactively due to
  this environment's overlay scrollbars masking the bug, but confirmed the
  underlying scrollbar-toggle mechanism (`hasVScroll` true→false across
  pages 1-2→3) is real on the live site, which is what the fix targets.
