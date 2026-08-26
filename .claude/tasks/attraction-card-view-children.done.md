# Task: View child attractions from the parent's card

Status: done
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

## Design Brief

**Note on current state:** `AttractionGridCard.tsx`'s outer element was changed from `<button>` to `<div role="button" tabIndex={0}>` in a recent fix (it was invalidly nesting action buttons inside a button) — the click/keyboard-activation behavior is unchanged, just the tag. Any `stopPropagation()` guidance below still applies the same way to a div.

**Decision: self-contained expansion inside the card itself, not a grid-spanning row or flyout.** The grid layout (`AttractionGridCard`s mapped in a CSS `display: grid` by each caller — Explore, etc.) would require lifting expand state up into every caller to inject a full-row-span sibling, touching multiple files for what should be a self-contained card behavior. Instead: `AttractionGridCard` owns its own `expanded` boolean locally. When expanded, the card's own box grows taller to show its children below the existing body content — CSS Grid auto-sizes each row to its tallest cell, so this only affects that one card's row height, not sibling cards' layout. No caller changes needed; every consumer of `AttractionGridCard` gets this for free.

**Decision: lightweight child rows, not nested full `AttractionGridCard`s.** Per the task's "unless a lighter-weight variant is needed for density" allowance — nesting full photo-cards recursively inside a grid tile would be visually cramped and doesn't match the existing card's own density. Instead, render each child as a compact row: type icon + name + city, matching the visual weight of a list item, not a card.

**Interaction:**
- The existing child-count badge (Layers icon, in `.badges`) becomes clickable — wrap it in a `<button>` with `stopPropagation()` (same `stopAnd()` helper pattern already used for the edit/delete/add-to-trip buttons) so it doesn't also trigger the card's own click-to-open-detail-modal behavior. Toggles `expanded`.
- When `expanded` becomes true for the first time, fetch this attraction's children (new API support — see below) and cache the result in local state; toggling closed/open again doesn't refetch.
- Show a small inline spinner (reuse `Spinner` from `src/components/Spinner`) while the first fetch is in flight.
- Each child row is clickable and calls the same `onClick` prop the parent card already receives (`onClick(child)`) — reuses the existing shared `AttractionDetailModal` that every other card/marker already opens through (per project learnings: check whether cards already route through one shared detail modal before adding new click-through behavior — they do, via the `onClick` prop threaded in from each caller).
- Child rows sit in a new section below `.body`, separated by a top border (`1px solid var(--color-border-subtle)`, matching `.parentLine`'s existing muted-accent-color treatment for the equivalent "nesting" concept on a child's own card).

**New API support needed** (children aren't currently queryable):
- `GET /api/attractions` — add a `parentAttractionId` query param, filtering `Attraction.find({ parentAttractionId })`. `searchAttractions` (`src/lib/services/attractions.service.ts`) currently requires at least one of `country`/`city`/`type` to be present (`throw badRequest(...)` otherwise) — widen that gate to also accept `parentAttractionId`.
- `src/services/attractions.service.ts` (client) — add `getChildAttractions(parentAttractionId: string, token?: string | null)`, following the exact pattern of `getAttractionsByCity`.

**Visual tokens:** no new ones — child-row icon/text sizing matches `.meta` (12px icon, secondary text color); the section divider reuses `--color-border-subtle` already used by `.hoursRow` in `AttractionDetailModal`.

Handing off to `/developer` now — implement per the Requirements above plus this Design Brief, then invoke `/product` to report completion.

## Implementation Notes
- Files created/modified:
  - `src/lib/services/attractions.service.ts` — `searchAttractions`/`SearchAttractionsParams` widened to accept `parentAttractionId`, satisfying the "at least one filter" gate on its own; adds `filter.parentAttractionId` to the Mongo query.
  - `src/app/api/attractions/route.ts` — passes the new `parentAttractionId` query param through.
  - `src/services/attractions.service.ts` + `src/services/index.ts` — new `getChildAttractions(parentAttractionId, token?)`, mirroring `getAttractionsByCity`'s exact shape (`includeHidden=true`, since children are the same public-discovery data as their parent).
  - `swagger.yaml` — documented the new `parentAttractionId` query param on `GET /api/attractions`.
  - `src/components/AttractionGridCard/AttractionGridCard.tsx` + `.types.ts` + `.module.css` — child-count badge is now a `<button>` (`stopPropagation` on click) toggling local `expanded` state; fetches + caches children on first expand (`Spinner` while loading); each child renders as a compact clickable row (icon/name/city) that calls the parent's own `onClick` prop with the child — reusing the shared `AttractionDetailModal` every other card already opens through. New optional `token` prop threaded through for the fetch (omitting it still works, as an anonymous fetch).
  - **Post-review addition #1 (per user follow-up — "add the children within the attraction card, not only grid card"):** `src/components/AttractionDetailModal/AttractionDetailModal.tsx` + `.module.css` — the existing static "Contains N places" badge is now the same clickable toggle, fetching and showing child rows below it inside the modal, mirroring the grid card's expand/fetch/cache pattern.
  - **Post-review addition #2 (per user follow-up — "in children card allow to click on the parent chip to open it, same for parent towards children"):** full bidirectional navigation, added across both surfaces:
    - New `GET /api/attractions/{id}` route (didn't exist before — only `PUT`/`DELETE` did) + `getAttractionById(id)` in `src/lib/services/attractions.service.ts` + client-side `getAttraction(id, token?)` in `src/services/attractions.service.ts`/`index.ts` — needed because a child only carries its parent's `id`/`name`, not the full record, so opening the parent requires a fetch.
    - `AttractionGridCard.tsx` — the "Part of X" line is now a clickable button (`.parentLine`) that fetches the full parent via `getAttraction` and calls the card's existing `onClick` prop with it (same modal-opening mechanism every other click already uses). Child rows (added in the original pass) already called `onClick(child)` directly, needing no further change.
    - `AttractionDetailModal.tsx` — gained a new optional prop, `onNavigateToAttraction?: (attraction) => void`, which callers wire to the same state setter they already use to open the modal (e.g. `setSelectedAttraction`/`setViewingAttraction`). When present: the "Part of X" badge becomes clickable (fetches the parent via `getAttraction`, then calls `onNavigateToAttraction`), and child rows become clickable (`onNavigateToAttraction(child)` directly, no fetch needed — already have full data). When the prop is omitted, both render as their original non-interactive `<p>`/`<div>` form — this is why the prop is optional rather than required, so a caller that hasn't been updated still compiles and renders correctly. Grepped every real call site of `AttractionDetailModal` (`ExploreClient.tsx`, `TripDetailClient.tsx`, `CalendarSection.tsx`, `CategoryAttractionsModal.tsx` — a 5th match in `NearbyAttractionsModal.types.ts` was just a comment, not a render call) and wired all 4.
    - Expansion/loading state (`childrenExpanded`, `parentLoading`, etc.) already reset per-attraction via the existing `useEffect` keyed on `attraction?._id` in the modal, and is inherently per-instance in the grid card (no reset needed — a new card is a new component instance).
- Deviations from task requirements: none from the original brief; both additions above were explicit user-requested scope expansions during review, each implemented consistently with the already-established patterns (self-contained expansion, reuse of the existing card-click/modal-open mechanism) rather than inventing new ones.
- New design tokens used: none — all new interactive elements reuse existing spacing/color/border tokens already established by sibling elements (`.actionBtn` hover/focus treatment, `.badge` colors, `.hoursRow` borders).

Verified live against real DB data: "Arena Mall" (Budapest, `_id: 6a4246c6a95b4a77030a4686`) has 3 children (KFC, Mevlana Kebab, Szivárvány Wok) — confirmed via direct `GET /api/attractions?parentAttractionId=...` that the children filter returns exactly those 3, and via direct `GET /api/attractions/6a4246c6a95b4a77030a4686` that the new single-attraction fetch (used for the parent-chip navigation) returns the correct record with `childAttractionCount: 3`.

## Completion Summary
Attraction cards (both the compact grid tile and the full detail card) can now expand to show their nested children, and children can navigate back up to their parent — a "Part of X" chip click fetches and opens the full parent record, while clicking a child in the expanded list opens that child, all reusing the app's existing shared detail-modal mechanism rather than inventing new navigation. Confirmed working live against "Arena Mall" and its 3 children in Budapest. Confirmed by user on 2026-08-26.

Verified with `npx tsc --noEmit` (clean) and `npx eslint` on all changed files (clean).
