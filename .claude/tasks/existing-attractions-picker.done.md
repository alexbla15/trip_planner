# Task: Existing Attractions Picker

Status: done

Track: A
Track reason: new search-and-select UI surface for browsing/adding existing DB attractions to a trip; no existing pattern

## Problem
Every time a traveler adds an attraction to a trip, they must fill in all details from scratch — even if the same attraction (e.g. "Colosseum" in Rome) already exists in the database from a previous trip. This is tedious and creates duplicate data.

## Goal
Before the manual creation form, travellers can search and select existing attractions from the database for the trip's country, and add them to the current trip in one click.

## Requirements

### Backend
- `GET /api/attractions?country=<country>&q=<search>` — new query-param-based search endpoint:
  - `country` param (required): filters attractions by country
  - `q` param (optional): fuzzy name search (case-insensitive `$regex` on `name`)
  - Returns array of `Attraction` objects, max 20 results, sorted by name
  - No auth required (attractions are not private — public discovery)
  - Create `src/app/api/attractions/route.ts` (GET handler only)

### Frontend — new `AttractionSearchModal` component
New component at `src/components/AttractionSearchModal/`:
- `AttractionSearchModal.tsx` — "use client"
- `AttractionSearchModal.module.css`
- `AttractionSearchModal.types.ts`

Props:
```ts
interface AttractionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  country: string;                       // pre-filtered to trip's country
  onAdd: (attraction: Attraction) => void; // called when user picks an existing one
  onCreateNew: () => void;               // opens NewAttractionModal instead
}
```

UI layout (modal, same shell pattern as `NewAttractionModal`):
- Header: "Add Attraction" + close button
- Search input: `<input type="search">` pre-labelled "Search attractions in {country}…"; debounced 300ms; calls `GET /api/attractions?country=&q=` as user types
- Results list: each item shows attraction name, types (comma-separated), city — click to add
- Empty state when no results: "No attractions found." + "Create a new one →" button
- Footer: always visible "Create new attraction" secondary button as an alternative to searching

Wiring in `TripDetailClient`:
- Replace the direct "Add Attraction" → `NewAttractionModal` flow with:
  1. "Add Attraction" → opens `AttractionSearchModal`
  2. User selects existing → call `POST /api/trips/[tripId]/attractions` body: `{ name, country, city, types, ... }` mapped from the existing attraction data → add to local list
  3. User clicks "Create new" → close search modal, open `NewAttractionModal` as before

## Constraints
- CSS Modules only, no inline styles
- The country is pre-set from the trip and locked (depends on `attraction-country-default` task being done first)
- The component must close cleanly when navigating away — use the existing modal portal pattern from `NewAttractionModal`

## Completion Summary
Existing attractions picker confirmed by the user on 2026-06-29. New `GET /api/attractions?country=&q=&type=` endpoint, `AttractionSearchModal` component with 4 body states, wrapping category chips for type filtering, and full wiring in `TripDetailClient`. "Add Attraction" now opens search first; "Create new" falls through to the manual form.

## Implementation Notes
- Files created: `src/app/api/attractions/route.ts`, `src/components/AttractionSearchModal/AttractionSearchModal.tsx`, `AttractionSearchModal.module.css`, `AttractionSearchModal.types.ts`
- Files modified: `src/components/index.ts`, `src/app/trips/[id]/TripDetailClient.tsx` (new search state, `handleSearchAdd`, `handleSearchCreateNew`, "Add Attraction" button now opens search modal, `<AttractionSearchModal>` rendered)
- Deviations from brief: none
- New design tokens used: none

## Out of scope
- Cross-country attraction search
- Editing the selected attraction before adding
- Preventing duplicates

---

## Design Brief

### File map
```
src/
  app/api/attractions/route.ts          ← GET handler (backend)
  components/AttractionSearchModal/
    AttractionSearchModal.tsx           ← "use client"
    AttractionSearchModal.module.css
    AttractionSearchModal.types.ts
```

---

### Modal shell (same pattern as `AttractionDetailModal`)

**Backdrop**
`position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px`
Fade-in animation: `opacity 0→1, 200ms ease-out`
Click-outside → `onClose()`

**Container**
`width: min(520px, calc(100vw - 48px)); max-height: 80dvh; background: var(--color-surface); border-radius: var(--radius-xl); box-shadow: var(--shadow-xl); display: flex; flex-direction: column; overflow: hidden`
Slide-up animation: `opacity 0→1 + translateY(12px)→0, 200ms ease-out`
ESC key → `onClose()`

---

### Header (sticky, does not scroll)

`position: sticky; top: 0; background: var(--color-surface); padding: 18px 20px 14px; border-bottom: 1px solid var(--color-border-subtle); display: flex; align-items: center; justify-content: space-between; gap: 12px; z-index: 1; flex-shrink: 0`

- Left: Lucide `Search` icon (18px, `var(--color-primary)`) + `<h2>` "Add Attraction" — `font-family: var(--font-plus-jakarta-sans); font-size: 17px; font-weight: 700; color: var(--color-text-primary); margin: 0`
- Right: close button — same `.closeBtn` pattern (36×36px, ghost, X icon 20px)

---

### Search bar (sticky, directly below header)

`position: sticky; top: 57px; background: var(--color-surface); padding: 12px 16px; border-bottom: 1px solid var(--color-border-subtle); z-index: 1; flex-shrink: 0`

Search input wrapper: `position: relative`
Icon: Lucide `Search` 15px, `position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--color-text-tertiary); pointer-events: none`

Input:
```
width: 100%; height: 44px; padding: 0 12px 0 40px
border: 1px solid var(--color-border); border-radius: var(--radius-md)
background: var(--color-bg-subtle); font-size: 14px; font-family: inherit
color: var(--color-text-primary)
transition: border-color 150ms ease-out, box-shadow 150ms ease-out
```
`placeholder={`Search in ${country}…`}`
Focus: `border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); outline: none`
Debounced 300ms before firing the fetch.

---

### Scrollable body

`flex: 1; overflow-y: auto; min-height: 180px`

**A — Initial state (query is empty)**
`display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 32px 20px; text-align: center`
Lucide `MapPin` 36px, `color: var(--color-text-tertiary)`
`<p>` "Search for attractions in {country}" — `font-size: 14px; color: var(--color-text-tertiary)`

**B — Loading state** (while debounced fetch is in flight)
3 skeleton rows:
```
display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--color-border-subtle)
```
Each row:
- Left: `36×36px` circle skeleton, `border-radius: var(--radius-full)`
- Right block: two lines of skeleton (100% wide, then 60% wide), `height: 12px; border-radius: var(--radius-sm)`
All use shimmer animation (same pattern as `TripCardSkeleton`): `background: linear-gradient(90deg, var(--color-bg-subtle) 25%, var(--color-border-subtle) 50%, var(--color-bg-subtle) 75%); background-size: 400px 100%; animation: shimmer 1.4s ease-in-out infinite`

**C — Results list** (attractions found)
`<ul>` with `list-style: none; padding: 0; margin: 0`

Each result row `<li>`:
```
display: flex; align-items: center; gap: 12px; padding: 10px 16px
border-bottom: 1px solid var(--color-border-subtle)
cursor: pointer
transition: background 150ms ease-out
```
Hover: `background: var(--color-primary-light)`
Focus-visible: `outline: 2px solid var(--color-primary); outline-offset: -2px`
`aria-label={`Add ${attraction.name} to trip`}`
`role="button"` or `<button>` full-width

Row internals:
- **Icon circle** (36×36, `border-radius: var(--radius-full)`, `background: var(--color-bg-subtle)`, `color: var(--color-text-secondary)`, `display: flex; align-items: center; justify-content: center; flex-shrink: 0`) — use `ICONS[attraction.types[0]]` from `AttractionTypeChip`; fall back to Lucide `MapPin` if no types
- **Info block** (`flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px`):
  - Name: `font-size: 14px; font-weight: 600; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
  - Meta: `font-size: 12px; color: var(--color-text-tertiary)` — `{types.join(", ")} · {city}`
- **Add indicator** (right): Lucide `Plus` 16px, `color: var(--color-primary); flex-shrink: 0`

**D — Empty state** (query present, zero results)
`display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px 20px; text-align: center`
Lucide `SearchX` 36px, `color: var(--color-text-tertiary)`
`<p>` "No attractions found in {country}" — `font-size: 14px; color: var(--color-text-tertiary)`
Button "Create a new one →" — `height: 40px; padding: 0 18px; border: 1px solid var(--color-primary); border-radius: var(--radius-md); background: transparent; color: var(--color-primary); font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px` + Lucide `Plus` 14px; on click → `onCreateNew()`

---

### Footer (sticky, always visible)

`position: sticky; bottom: 0; background: var(--color-surface); padding: 12px 16px; border-top: 1px solid var(--color-border-subtle); display: flex; justify-content: flex-end; flex-shrink: 0`

"Create new attraction" ghost button:
```
height: 44px; padding: 0 20px; border: 1px solid var(--color-border)
border-radius: var(--radius-md); background: transparent
color: var(--color-text-secondary); font-size: 14px; font-weight: 600
cursor: pointer; display: inline-flex; align-items: center; gap: 8px
font-family: inherit
transition: border-color 150ms ease-out, color 150ms ease-out
```
Icon: Lucide `PenLine` 15px
Hover: `border-color: var(--color-primary); color: var(--color-primary)`
Focus-visible: `outline: 2px solid var(--color-primary); outline-offset: 2px`
On click → `onCreateNew()`

---

### Wiring in `TripDetailClient`

1. Add `searchModalOpen` state (`useState(false)`)
2. Change the "Add Attraction" button to: `onClick={() => setSearchModalOpen(true)}`
3. Add `handleSearchAdd(attraction: Attraction)` — POSTs to `/api/trips/${trip._id}/attractions` with the attraction's fields mapped, adds result to local `attractions` state, closes the search modal
4. `handleSearchCreateNew()` — closes search modal, opens `NewAttractionModal` (`setModalOpen(true)`)
5. Render `<AttractionSearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} country={trip.country} onAdd={handleSearchAdd} onCreateNew={handleSearchCreateNew} />`

---

### Accessibility
- ESC closes modal, focus returns to trigger
- Results are `<button>` elements (not `<div>`) for native keyboard navigation
- `aria-label` on each result button describes the action
- Loading skeleton has `aria-hidden="true"`; `aria-live="polite"` region wraps the results list body so screen readers announce count changes
- Search input: `aria-label={`Search attractions in ${country}`}` (same attraction added twice)
