# Task: Shared AttractionFilter Component

Status: done

Track: B
Track reason: Refactor/extraction — no new visual surface; the design is already established in TripDetailClient. Component API design only.

## Problem
The search input + category chips UI was implemented inline in `TripDetailClient.tsx` (trip detail attractions tab). `AttractionSearchModal` has its own separate, slightly different implementation of the same widget. Two diverging implementations mean visual drift over time and double maintenance burden.

## Goal
A single `AttractionFilter` component covers the search input + category chips pattern and is used in both the trip detail attractions tab and the "Add Attraction" modal.

## Requirements
- Extract the search input + category chips into `src/components/AttractionFilter/`
- Component accepts:
  - `searchValue: string` + `onSearchChange: (q: string) => void`
  - `categories: string[]` — ordered list of chip labels; empty or single-item → hide the chips row
  - `selectedCategory: string | null` + `onCategoryChange: (cat: string | null) => void`
  - `placeholder?: string` (default: `"Search attractions…"`)
  - `searchLabel?: string` (default: `"Search attractions"` — visually hidden, used by screen readers)
- Replace the inline toolbar block in `TripDetailClient.tsx` with `<AttractionFilter>`
- Replace the search bar + category chips block in `AttractionSearchModal.tsx` with `<AttractionFilter>`
  - The modal currently has a two-level filter (categories → specific types within a category). Collapse this to the same single-level category chips (categories only, no sub-type drill-down). The modal already triggers an API search on category selection — wire `onCategoryChange` to re-run the search with the selected category, passing the category name as a type hint.
- Export the component from `src/components/index.ts`
- All state (searchValue, selectedCategory) stays in the parent — `AttractionFilter` is fully controlled

## Constraints
- CSS Modules only; styles in `AttractionFilter.module.css`
- Reuse the exact CSS design from `TripDetailClient.module.css`: `.srOnly`, `.attractionsToolbar`, `.searchBar`, `.searchIcon`, `.searchInput`, `.filterChips`, `.filterChip`, `.filterChipActive` — move these styles into the component's own module
- Remove the moved classes from `TripDetailClient.module.css` (no duplication)
- No Tailwind, no inline styles

## Out of scope
- Adding icons to category chips (the trip-detail filter currently uses text-only chips; keep that)
- Saving filter state to URL or localStorage
- Any new API endpoints

## Implementation Notes
- Files created: `src/components/AttractionFilter/AttractionFilter.tsx`, `AttractionFilter.module.css`, `AttractionFilter.types.ts`
- Files modified: `TripDetailClient.tsx`, `TripDetailClient.module.css`, `AttractionSearchModal.tsx`, `AttractionSearchModal.module.css`, `src/components/index.ts`
- Deviations from brief:
  - Added optional `inputRef` prop so the modal can auto-focus the input on open (the `searchRef` needed to be forwarded into the component's `<input>`)
  - Added optional `resultCount` prop so TripDetailClient's screen-reader aria-live announcement could live inside the component (avoiding a lone `.srOnly` class stranded in TripDetailClient after extracting the toolbar)
  - AttractionSearchModal category filter is **client-side only** — the API's `?type` param takes a specific type name, not a category name; filtering by category from the already-fetched text-search results is accurate and avoids a schema change
  - Two-level drill-down (categories → sub-types) collapsed to single-level category chips as required; "Show all results" button clears the category filter when it zeroes out the list
- New design tokens used: none

## Completion Summary
Extracted the search input + category chips into a shared `AttractionFilter` component (`src/components/AttractionFilter/`). Replaced the inline toolbar in `TripDetailClient.tsx` and the two-level category→type drill-down in `AttractionSearchModal.tsx` with the unified component. Post-review tweaks: added category icons (via `useAttractionTypes().byCategory`) and switched chips from horizontal scroll to wrapping; attractions list in trip detail now sorts alphabetically via `localeCompare`. Confirmed done by user on 2026-07-10.
