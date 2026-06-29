# Task: Paginate Attractions List in Trip Detail

Status: done

Track: A
Track reason: new UI interaction pattern — pagination controls and page state; no existing pattern to copy

## Problem
Travelers with many saved attractions scroll through a long, unbroken list in the trip detail page. There is no way to jump to a specific section or reduce the visible set, making the list hard to scan once it exceeds ~10 items.

## Goal
The attractions list in the trip detail view is broken into pages (e.g., 10 per page) with clear navigation controls, so any size list remains scannable.

## Requirements
- Paginate the attraction list rendered in the "Attractions" card in `TripDetailClient.tsx`
- Default page size: 10 attractions per page
- Show page controls only when total attractions > page size (no controls for small lists)
- Controls: "Previous" / "Next" buttons + current page indicator (e.g., "Page 2 of 5")
- Clicking "Add Attraction" or editing/deleting an attraction should not reset to page 1 — stay on current page unless the current page becomes empty after a delete (then go to previous page)
- Accessible: page control buttons have `aria-label` ("Go to previous page", "Go to next page"); current page indicator uses `aria-live="polite"` or similar
- Responsive: controls fit cleanly on mobile

## Constraints
- CSS Modules only — add to `TripDetailClient.module.css` (new classes) or a new colocated CSS file
- No external pagination library — implement with simple `useState` for current page
- All attraction data is client-side (already fetched) — no server-side pagination needed

## Out of scope
- Changing page size (10 is fixed for now)
- Infinite scroll
- URL-based pagination (query params)
- Filtering or search within the paginated list (separate task if needed)

## Implementation Notes
- Files modified: `src/app/trips/[id]/TripDetailClient.tsx`, `src/app/trips/[id]/TripDetailClient.module.css`
- Deviations from brief: `ChevronLeft` was already imported (used for the back link); added only `ChevronRight`. The `PAGE_SIZE` constant is placed in the render body (not module scope) since it's co-located with `totalPages` and `paginatedAttractions` and only used in one component.
- New design tokens used: none


## Completion Summary
Added client-side pagination to the Attractions card in TripDetailClient. The list slices to 10 items per page; Previous/Next controls with a Page X of Y indicator appear only when totalPages > 1. Page is preserved on add/edit and clamped on delete. Accessible via aria-live and aria-labels. Confirmed by user 2026-06-29.
