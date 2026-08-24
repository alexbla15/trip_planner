# Task: Nested attractions — detail display

Status: done
Track: A
Track reason: new UI affordance (parent/child badges) not covered by existing design-system tokens — mirrors the `usedInTripsBadge` precedent closely enough to fast-track the design decision, but is still a new visual pattern.

## Problem
Task 1 (`nested-attractions-data-model.done.md`) added `parentAttractionId`/`parentAttractionName`/`childAttractionCount` to every attraction API response, but nothing in the UI reads them — a user can create a parent/child link (via direct API use or, once task 2 ships, the picker UI) and never see any indication of it anywhere in the app. Confirmed via grep: zero references to these fields outside `src/app/api/attractions/`.

## Goal
Every attraction card that already exists in the app shows, where applicable: a child indicates which attraction it's nested inside ("Part of {parent}"), and a parent indicates how many attractions are nested inside it ("Contains N places").

## Requirements
- `AttractionDetailModal`: 
  - Child (`parentAttractionId` set): an informational badge/line showing `Part of "{parentAttractionName}"` — same visual family as the existing `usedInTripsBadge` (own color, since this is a structural fact, not a personal "used in trip" fact — don't reuse the same color, that would conflate two different meanings).
  - Parent (`childAttractionCount > 0`): an informational line showing `Contains N place{s}`.
  - Both are display-only in this task — no click-through navigation to the parent/children yet (that's a reasonable, separately-scoped follow-up, not required here).
- `AttractionGridCard`:
  - Child: a small text line under the city meta line, e.g. `Part of {parentAttractionName}` (truncated, matching the card's tight width).
  - Parent (`childAttractionCount > 0`): a small icon badge in the existing badges row (alongside the visited/used-in-trip badges), tooltip `Contains N place{s}`.
- Check whether any OTHER attraction card component in the app renders enough of an attraction's fields to be worth updating too (grep for `usedInTripsBadge`/`isVisited` consumers as a proxy for "cards that already show similar per-attraction facts") — don't limit this to just the two named above if there's a third card surface already showing comparable info.

## Constraints
- Purely additive/display — no new data fetching (the fields already ride on every attraction response from task 1).
- Reuse existing icon/badge/typography patterns from the codebase (don't invent a new visual language for this one feature).

## Out of scope
- Click-through navigation from a child's badge to open the parent's own card (or vice versa for a parent's children) — informational display only, per Requirements above.
- The parent-picker UI for creating/editing the link (task 2, separate).
- Excluding children from map pins (task 4, separate).

## Implementation Notes
- Files created/modified:
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx`/`.module.css` -- `.parentBadge` ("Part of \"X\"", primary-blue) and `.childCountBadge` ("Contains N places", accent-amber), both informational, no click-through.
  - `src/components/AttractionGridCard/AttractionGridCard.tsx`/`.module.css` -- `.parentLine` (small text under city meta) for children, `.badgeChildren` (Layers icon, amber, tooltip) in the existing badges corner for parents.
  - Checked `SidebarAttractionCard.tsx` (per the task's "check other card surfaces" requirement) -- deliberately left out of scope, it doesn't show isVisited/usedInTripNames either (intentionally minimal card), so adding nesting facts there would be inconsistent with its own established pattern, not a gap.
- Deviations from brief: none.
- New design tokens used: none -- reused `--color-primary`/`--color-accent`/`--color-accent-dark`, already in the design system.
- Verified live: created a real parent+child pair, confirmed all four surfaces (detail modal x2, grid card x2) render correctly via screenshots, then cleaned up the test data.

## Completion Summary
Attraction cards now surface the parent/child relationship added in task 1: a child shows a "Part of {parent}" badge (detail modal) or text line (grid card), and a parent shows a "Contains N places" badge/badge-icon in both. Confirmed by the user 2026-08-23.
