# Task: Show All Mood Tags on Explore Card

Status: done

Track: B
Track reason: small JSX + CSS change — render existing `tags` array instead of just `tag` string; no new component

## Problem
`ExploreCard` renders only the first mood tag (`item.tag`) in a badge overlay on the card image. Trips with multiple moods (the common case) only show one, hiding the rest of the trip's character.

## Goal
All of a trip's mood tags are visible on the explore card.

## Root Cause
`ExploreCard.tsx` destructures only `tag` from the item and renders `<MoodTagChip tag={tag} />` once. The full `item.tags` array (all moods) is available but unused.

## Requirements

### `src/components/ExploreCard/ExploreCard.tsx`
- Destructure `tags` from `item` in addition to (or instead of) `tag`
- Replace the single `<MoodTagChip tag={tag} />` with a mapped list of `<MoodTagChip>` for every entry in `tags` (fall back to `[tag]` if `tags` is empty)
- Wrap the chips in the existing `.tagBadge` container — let them stack or wrap naturally

### `src/components/ExploreCard/ExploreCard.module.css`
- Update `.tagBadge` to use `display: flex; flex-wrap: wrap; gap: 4px; align-items: flex-start` so multiple chips sit side-by-side and wrap if needed
- Keep the existing positioning (absolute, top-left corner of the image)

## Constraints
- CSS Modules only
- Do not add new wrapper elements beyond what's needed — reuse `.tagBadge`
- Chips may overflow the image on very-long tag names; that is acceptable (the badge scrolls within the card boundary)

## Out of scope
- Limiting the number of tags shown (show all)
- Hover states or tooltips on chips

## Implementation Notes
- Files modified: `src/components/ExploreCard/ExploreCard.tsx`, `src/components/ExploreCard/ExploreCard.module.css`
- Deviations from task requirements: added `justify-content: flex-end` and `max-width: calc(100% - 24px)` to `.tagBadge` so chips align to the right edge and don't overflow the card image boundary
- New design tokens used: none


## Completion Summary
ExploreCard now renders all of a trip's mood tags instead of only the first one. Updated ExploreCard.tsx to map over item.tags (falling back to [tag]) and updated .tagBadge in ExploreCard.module.css to flex/wrap layout aligned to the right edge. Confirmed by user 2026-06-29.
