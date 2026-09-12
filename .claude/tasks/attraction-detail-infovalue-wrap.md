Status: done
Track: B

## Request
AttractionDetailModal-module__infoValue should be wrappable

## Problem
`.infoValue` in `AttractionDetailModal.module.css` used `white-space: nowrap` +
`text-overflow: ellipsis` + `overflow: hidden`, truncating longer values (e.g. long
city names like "Villingen-Schwenningen") in the compact info-grid instead of
wrapping them onto multiple lines.

## Fix
`src/components/AttractionDetailModal/AttractionDetailModal.module.css`: replaced
the nowrap/ellipsis/hidden-overflow trio on `.infoValue` with `overflow-wrap:
break-word`, so long values wrap instead of being clipped.

## Implementation Notes
- `tsc --noEmit -p .`: clean (CSS-only change).
- Verified live via Playwright against `npm run dev`: navigated to a
  Villingen-Schwenningen attraction, opened its detail modal, confirmed via
  `getComputedStyle` that the target `.infoValue` element now has
  `whiteSpace: normal`, `overflow: visible`, `overflowWrap: break-word`.
  Screenshot confirmed "Villingen-Schwenningen, Germany" now wraps onto two
  lines inside its info-item box instead of being truncated with an ellipsis.
