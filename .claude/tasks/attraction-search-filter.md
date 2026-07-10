# Task: Attraction Search & Filter in Trip Detail

Status: reviewing

Track: A
Track reason: New UI surface — search input + category filter tabs/chips inside the existing attractions tab panel

## Problem
The Attractions tab in `trips/[id]` shows a flat list of all the trip's attractions with no way to find a specific one. On trips with many attractions (10+) users have to scroll and scan manually. There's also no way to see only attractions of a certain category (e.g. "show me all restaurants").

## Goal
Users can quickly find attractions in a trip by typing a name or filtering by attraction category, without leaving the attractions tab.

## Requirements
- Text search: filter the visible attraction list in real-time as the user types (client-side, no API call)
- Category filter: clicking a category shows only attractions of that category; clicking again deselects (toggle); "All" resets the filter
- Both filters compose: text + category filter together narrow the list
- Empty state: friendly message when no attractions match the current filter
- The search/filter UI sits at the top of the attractions tab panel, above the existing attraction list
- Responsive: works on mobile (filter chips must scroll horizontally if they overflow)
- Accessible: search input has a label; category chips use `aria-pressed`

## Constraints
- Client-side filtering only — no new API endpoints
- Uses existing `AttractionTypeRecord` data already loaded via `useAttractionTypes`
- CSS Modules only, no Tailwind or inline styles
- Must not break the existing add-attraction flow (the "Add attraction" button stays)

## Out of scope
- Sorting attractions (separate future task)
- Saving filter state to URL or localStorage
- Server-side search

## Implementation Notes
- Files created/modified: `src/app/trips/[id]/TripDetailClient.tsx`, `src/app/trips/[id]/TripDetailClient.module.css`
- `regularAttractions` promoted to a `useMemo` before early returns so `presentCategories` and `filteredAttractions` (also useMemos) could depend on it without violating hooks rules
- `useEffect(() => { setPage(1); }, [searchQuery, selectedCategory])` resets pagination when either filter changes
- Category chips only render when `presentCategories.length > 1` (single-category trips see no chips — nothing to filter)
- Clicking an already-active category chip deselects it (toggles back to "All")
- Native browser `×` clear button on `type="search"` hidden via `::-webkit-search-cancel-button` to keep visual consistency
- Deviations from brief: none
- New design tokens used: none (all existing tokens)
