# Task: View child attractions from the parent's card

Status: intake
Track: A
Track reason: New interaction/visual pattern — no existing click-through/expand UI for children; `AttractionGridCard.tsx` currently only shows a static child-count badge (Layers icon), needs a Design Brief for how children are revealed and laid out next to the parent.

## Problem
`AttractionGridCard.tsx` shows a child-count badge (via `childAttractionCount`, Layers icon) when an attraction has nested children (`parentAttractionId` relationship, one level deep, per `src/lib/services/nestedAttractions.service.ts`). There's no way to actually see or interact with those children from the card — a user has to know to search for them separately.

## Goal
Clicking the child-count indicator on a parent attraction's card reveals the child attractions' own cards next to (or otherwise clearly associated with) the parent, without navigating away from the current view.

## Requirements
- Clicking the existing child-count badge/indicator on `AttractionGridCard.tsx` toggles a view showing each child attraction's card.
- Needs a Design Brief covering: where the children render relative to the parent (inline expansion within the grid, an adjacent row, a flyout/panel), how many can be shown, and what happens on a grid with many parents expanded at once.
- Reuse the existing `AttractionGridCard` component (or detail modal) to render each child rather than inventing a new child-card format, unless the Design Brief determines a lighter-weight variant is needed for density.
- Must work within whatever grid/list context currently renders `AttractionGridCard` (check callers — at least Explore and any other attraction listing surfaces).

## Constraints
- Nesting is one level only (enforced server-side in `nestedAttractions.service.ts`) — children never have their own children, so no recursive expansion UI is needed.
- Per project learnings, check whether every card already routes clicks through one shared detail modal before adding new click-through behavior — the badge click should be additive to the existing card-click-opens-detail-modal behavior, not conflict with it (e.g. use `e.stopPropagation()` on the badge if the whole card is also clickable).

## Out of scope
- Editing children from this expanded view (existing edit affordances are unaffected).
- Changing the one-level nesting depth limit.
