# Task: Searchable, sorted, paginated attraction-category picker in Analytics (inline, not a popup)

Status: done
Track: A
Track reason: replaces an existing popup interaction with a new inline expanding-box pattern, plus search/sort/pagination controls not yet established for this picker.

## Problem
When picking an attraction category in Analytics, the current picker opens as a popup/modal with no search box, no pagination, and results not ordered alphabetically — making it slow to find a category once the list is long.

## Goal
Picking a category in Analytics no longer opens a popup; instead, an inline box renders below the trigger (in the page flow) containing a search input, alphabetically-sorted results, and pagination — so the user can type to filter, see results in a predictable order, and page through them without a modal overlay.

## Requirements
- Remove the popup/modal behavior for the category picker.
- Render an inline expanding box directly beneath the picker trigger when opened (pushes surrounding content down, not an overlay).
- Add a search/filter text input at the top of the box that filters results by category name as-you-type.
- Sort results alphabetically (A→Z) by default.
- Paginate results using the app's existing pagination UI pattern (see `NearbyAttractionsModal` / the Explore grid pagination from `explore-grid-view.done.md`).
- Selecting a category closes/collapses the inline box and applies the filter to the Analytics view, same as the popup did today.

## Constraints
- Reuse the existing pagination component/pattern rather than building a new one.
- Keep the same underlying category data/filtering logic — this task changes presentation and browsability, not what categories exist or how they filter Analytics data.

## Out of scope
- Multi-select category picking (unless it already works that way today — preserve existing single/multi behavior, don't change it).

## Design Brief

This is a Next.js web app using CSS Modules — no design-system CLI available for this stack, brief written directly from `docs/DESIGN_SYSTEM.md` tokens and existing component patterns.

**What's changing:** `CategoryAttractionsModal` (backdrop + centered popup, opened when a user clicks a sub-slice in `CategoryDonutChart`'s drill-down chart) becomes `CategoryAttractionsPanel` — an inline card that expands in the page flow directly below the sub-chart, pushing the rest of the Analytics page down instead of overlaying it.

- **Container:** replace `.backdrop`/`.container` (fixed overlay + centered box) with a single `.panel` block: full width of its parent, `background: var(--color-bg-subtle)`, `border: 1px solid var(--color-border-subtle)`, `border-radius: var(--radius-lg)`, `margin-top: 16px`. Entrance animation: fade + slide down 8px over `var(--duration-base) var(--easing-out)` (replaces the old scale-up modal animation — a vertical expand reads as "growing in place" rather than "appearing over content").
- **Header:** keep the existing icon + type-name title + close (X) button row, unchanged visually (`var(--color-surface)` background, bottom border) — just no longer `position: sticky` (nothing to stick against once it's not a scrolling modal body).
- **New search bar:** icon-left text input directly under the header, matching `AttractionFilter`'s established search-bar visual (`Search` icon absolutely positioned at 12px inset, `38px` height input, `var(--radius-md)`, `var(--color-border)` idle border, `var(--color-surface)` background) — only shown once results have loaded and there's at least one result (no point showing a search box over an empty/loading list).
- **Results list:** reuse the exact existing `.resultRow`/`.resultIcon`/`.resultName`/`.resultMeta` styles unchanged (icon circle + name + city/country, hover → `var(--color-primary-light)`).
- **Sort:** client-side, alphabetical by name (`localeCompare`) — always applied, no sort control needed since there's only one order per the requirements.
- **Pagination:** reuse the shared `Pagination` component (`src/components/Pagination`) exactly as `AnalyticsClient`'s Top Explorers table and Explore's grid view already do — centered prev/"Page X of Y"/next row, page size `TABLE_PAGE_SIZE` (5, from `src/config/ui.ts`, the same constant already used for every other paginated table in this app).
- **Empty/no-match state:** reuse the existing `SearchX` + placeholder text pattern; add a distinct "No matches for {query}" message when the search filters everything out (vs. "No {type} attractions found" when there's genuinely zero data).
- **Selecting a result:** unchanged — opens `AttractionDetailModal` on top (that's a separate, legitimately-modal detail view, not part of this popup→inline conversion). The panel itself only collapses via its own header close (X) button or by picking a different sub-slice (`selectedType` changes).

**Tokens used (all pre-existing, none new):** `--color-bg-subtle`, `--color-surface`, `--color-border`, `--color-border-subtle`, `--color-primary`, `--color-primary-light`, `--color-text-primary/secondary/tertiary`, `--radius-md/lg`, `--duration-base/fast`, `--easing-out`.

## Implementation Notes
- Files created/modified:
  - `src/components/CategoryAttractionsPanel/` (renamed from `CategoryAttractionsModal/`, `git mv` to preserve history) — `CategoryAttractionsPanel.tsx`/`.module.css`/`.types.ts`/`index.ts`.
  - `CategoryAttractionsPanel.tsx` — dropped `isOpen`/`ModalShell` wrapper (parent already conditionally renders via `{selectedType && (...)}`); added `query`/`page` state, client-side filter+sort (`localeCompare`) memo, `Pagination` component wired to `TABLE_PAGE_SIZE`; search bar only rendered once `results.length > 0`.
  - `CategoryAttractionsPanel.module.css` — replaced `.backdrop`/`.container`/sticky `.header` with a single non-modal `.panel` block (expand-in-place animation instead of scale-up-over-backdrop); added `.searchBar`/`.searchIcon`/`.searchInput` (new, following `AttractionFilter`'s established search-bar visual) and `.paginationWrap`; `.body` capped at `max-height: 360px` with its own scroll instead of the old `80dvh` modal-body scroll.
  - `src/components/CategoryDonutChart/CategoryDonutChart.tsx` — swapped `CategoryAttractionsModal` (rendered with `isOpen`) for `CategoryAttractionsPanel` (rendered inline, no `isOpen` prop needed — presence in the tree IS the open state).
  - `src/components/index.ts` — updated barrel export name.
- Deviations from brief: none.
- New design tokens used: none — all tokens listed in the Design Brief already existed in `docs/DESIGN_SYSTEM.md`.
- Verified: `next build` succeeds.

## Completion Summary
The Analytics category drill-down popup (`CategoryAttractionsModal`) is now an inline expanding panel (`CategoryAttractionsPanel`) rendered directly beneath the sub-chart it drills from, with a search box, alphabetical sort, and shared pagination — no more full-screen backdrop/modal. Closed 2026-08-26.
