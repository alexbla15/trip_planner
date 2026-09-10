# Task: Attractions tab on trips/[id] looks broken on mobile

Status: done
Track: B
Track reason: bug fix — responsive layout, no new UI pattern

## Problem
Each attraction row in the trip Attractions tab crams icon + title + meta text +
thumbnail + up to 4 action buttons into a single horizontal flex row with no mobile
breakpoint. On a phone-width viewport there's nowhere near enough room: the meta line
(`.attractionMeta`, single-line `nowrap` + ellipsis) truncated mid-word ("Freiburg im
Br..."), titles wrapped awkwardly fighting for space, and the row read as cramped/illegible.

## Goal
The attraction list reads cleanly on a phone — full meta text visible (wrapping instead of
truncating), action buttons not fighting the title/thumbnail for horizontal space. Desktop
unchanged.

## Requirements
- Wrap the icon/title-meta/thumbnail group into a new `.attractionMain` container
  (`src/app/trips/[id]/TripDetailClient.tsx`), so `.attractionItem` has exactly 2 top-level
  flex children (`.attractionMain`, `.rowActions`) instead of 4
- At `max-width: 480px` (this file's existing breakpoint convention): `.attractionItem`
  wraps, `.rowActions` becomes a full-width row below `.attractionMain`, and
  `.attractionMeta` wraps instead of single-line-truncating
- Desktop (above 480px) stays byte-for-byte the same layout as before

## Constraints
- The mobile override rules needed doubled selectors (`.rowActions.rowActions`, etc.) to
  outrank the base rules — Next's CSS Modules bundle order doesn't guarantee the media
  query ends up after the plain rule it overrides, so equal specificity let the plain rule
  win even at a matching viewport. Confirmed via computed-style inspection, not assumed —
  the undoubled version silently didn't apply. Same technique already used for
  `.photoWrapper` in `AttractionGridCard.module.css`.

## Out of scope
- Any other trip-detail tab's mobile layout

## Implementation Notes
- Files created/modified:
  - src/app/trips/[id]/TripDetailClient.tsx (wrapped icon + attractionInfo + thumbnail in a new `.attractionMain` div, sibling to the existing `.rowActions` div)
  - src/app/trips/[id]/TripDetailClient.module.css (new `.attractionMain` style; `.attractionItem` gains `justify-content: space-between`; new `@media (max-width: 480px)` block with doubled selectors for `.attractionItem`, `.rowActions`, `.attractionMeta`)
- Deviations from task requirements: none
- New design tokens used: none
- Verification: tsc clean; eslint identical to pre-existing baseline (6 errors, confirmed via git-stash diff — same set-state-in-effect issues present before this change too); live-verified on a real trip (created via a one-off DB script, 6 real Freiburg attractions, deleted after testing) at a 390px mobile viewport before/after — confirmed the first CSS attempt silently didn't apply (computed style still showed nowrap/ellipsis) due to CSS Modules bundle ordering, fixed with doubled selectors and re-verified computed style shows `white-space: normal` etc. as expected; confirmed desktop (1280px) renders identically to before

## Completion Summary
Fixed the trip Attractions tab's mobile layout: action buttons now stack onto their own row below the title/meta on screens <=480px, and meta text wraps instead of truncating mid-word. Desktop confirmed unchanged. Confirmed by the user 2026-09-10.
