# Task: Show other chain locations in the attraction detail card

Status: done
Track: B
Track reason: extends an existing UI pattern (children list) in the same component with existing design tokens/components — no new visual surface

## Problem
Chain attractions (McDonald's, Adidas, etc.) have many separate branches in the same city, each its own Attraction document. Viewing one branch in the read-only attraction card (AttractionDetailModal) gives no way to discover the chain's other branches nearby — a user has to already know they exist and search separately.

## Goal
Viewing a chain attraction's read-only card shows an "Other locations in {city}" section listing sibling branches (same name, same city, different document), letting the user navigate directly to any of them.

## Requirements
- In `src/components/AttractionDetailModal/AttractionDetailModal.tsx`, add an "Other locations in {city}" section that mirrors the existing "Contains N places" children-list pattern in the same file: a toggle button, lazy-fetch on first expand (not eager on every modal open), a loading spinner while fetching, and a paginated list (5 per page via `ATTRACTIONS_PAGE_SIZE` from `@/config/ui`, same Prev/Next controls as the children list).
- Fetch via the client service `getOtherLocationsInCity(name, city, token?)` in `src/services/attractions.service.ts` (already added, calls existing `GET /api/attractions?city=X&q=Y&includeHidden=true` — no new backend route). Export it from the `src/services/index.ts` barrel (currently missing).
- The `q` param does a partial case-insensitive regex match server-side — filter the response client-side to an exact match (trimmed, case-insensitive `name`) and exclude the attraction currently being viewed (`_id !== attraction._id`).
- Rows navigate via the existing `onNavigateToAttraction` prop, exactly like child rows (button when the prop is present, plain non-interactive row when it's absent).
- Only render this section for regular attractions — skip for `subtype === "residence"` and `subtype === "flight"` (mirror the existing `isResidence`/`isFlight` guards already in this file), and only when `attraction.city` is set (nothing to scope the search to otherwise).
- If the fetch resolves to zero other locations, show an inline "No other locations found in {city}" message rather than acting like the toggle failed — chains are the exception, not the rule, so this will be the common empty case.
- Reset this section's state (expanded/loading/results/page) whenever the displayed attraction changes, same as the existing children-list reset effect (`useEffect` keyed on `attraction?._id`).

## Constraints
- No new API route — must reuse `GET /api/attractions` with its existing `city`/`q`/`includeHidden` params.
- Follow the existing children-list code shape closely (state naming, JSX structure, pagination controls, CSS classes) so the two sections read as one consistent pattern in the file, not two different implementations.
- `AttractionDetailModal` doesn't currently receive a `token` prop and `getChildAttractions` is already called without one elsewhere in this file — follow that same precedent (omit token) rather than threading a new prop through every call site.

## Out of scope
- Any ranking/sorting beyond whatever order the API already returns.
- Deduplicating chains across different cities (e.g. showing McDonald's branches in a different city) — same-city only.
- Changes to `AttractionGridCard` or any other place an attraction is displayed — this task is scoped to `AttractionDetailModal` only.

## Implementation Notes
- Files created/modified:
  - `src/services/attractions.service.ts` — `getOtherLocationsInCity(name, city, token?)` (already scaffolded by the user before this task started; left as-is).
  - `src/services/index.ts` — exported `getOtherLocationsInCity` from the barrel (was missing).
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` — added `otherLocationsExpanded/Loading/otherLocations/otherLocationsPage` state, reset alongside the existing children-list state on attraction change; `handleToggleOtherLocations` lazy-fetches via `getOtherLocationsInCity`, filters the partial-match API response down to an exact (trimmed, case-insensitive) name match excluding the viewed attraction itself; new "Other locations in {city}" section rendered right after the existing "Contains N places" children section, reusing `.childrenSection`/`.childCountBadge`/`.childrenList`/`.childRow`/`.childRowButton`/`.childrenPagination`/`.childrenPageBtn`/`.childrenPageInfo` classes and the same Prev/Next pagination shape (`ATTRACTIONS_PAGE_SIZE`). Guarded on `!isResidence && !isFlight && attraction.city`.
  - `src/components/AttractionDetailModal/AttractionDetailModal.module.css` — two new classes: `.otherLocationParent` (small parent-mall annotation next to a result's name, e.g. "(Galleria Mall)") and `.emptyChildrenNote` (centered "No other locations found in {city}" message).
- Deviations from task requirements: each result row also shows `(ParentMallName)` when the sibling branch itself has a parent (e.g. a McDonald's inside a different mall) — not explicitly requested, but the existing `parentAttractionName` field was already available on the fetched results and disambiguates same-named branches inside different malls in the same city.
- New design tokens used: none — reused existing color/spacing tokens already in the module.

## Completion Summary
Built an "Other locations in {city}" section in AttractionDetailModal that mirrors the existing "Contains N places" children pattern (toggle, lazy fetch, spinner, 5-per-page pagination), reusing GET /api/attractions with client-side exact-name filtering — no new backend route. Confirmed by user 2026-09-01.
