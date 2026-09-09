# Task: Make "permanently closed" unmistakable in Explore's grid and map views

Status: done
Track: B
Track reason: extends the existing isPermanentlyClosed/status-chip logic into two more views with a prominent visual treatment — no new interaction pattern

## Problem
A permanently closed attraction only surfaced as a small status chip inside the detail
modal — in Explore's grid view it looked like any other card, and on the map it was just
another type-colored pin. Nothing signaled "don't bother visiting" until you opened it.

## Goal
A permanently closed attraction is immediately, unmistakably distinguishable in both grid
and map view, without opening the detail modal.

## Requirements
- Extracted `isAttractionPermanentlyClosed(openingHours, seasonalHours)` from
  `getStatusChips`'s existing guard logic (`src/lib/attractionStatusChips.ts`), exported
  from `@/lib`, so grid card and map marker can check this without pulling in the full
  chip-derivation/array allocation
- Grid card (`AttractionGridCard.tsx`): photo grayscaled/dimmed, bold red "Permanently
  closed" banner overlaid on the photo (Ban icon + label), card's aria-label appended with
  "(permanently closed)"
- Map marker (`mapIcons.tsx`'s `makeAttractionMarkerIcon`): permanently closed overrides
  the type color/icon entirely — solid red pin (new `CLOSED_MARKER_COLOR`, matches
  `--color-error`) with a white Ban glyph, outranking selected/visited border styling;
  tooltip text gains "· Permanently closed"

## Constraints
- Reuse the existing `isPermanentlyClosed`/seasonalHours-aware logic (via the new shared
  helper) rather than reimplementing the "no seasonalHours + all-closed" check a third time
- Don't change the detail-modal chip itself — already correct

## Out of scope
- Any change to residence/flight subtypes' own hours handling

## Implementation Notes
- Files created/modified:
  - src/lib/attractionStatusChips.ts (extracted isAttractionPermanentlyClosed, getStatusChips now calls it)
  - src/lib/index.ts (export isAttractionPermanentlyClosed)
  - src/lib/mapIcons.constants.ts (new CLOSED_MARKER_COLOR = "#DC2626", matching --color-error)
  - src/lib/mapIcons.tsx (makeAttractionMarkerIcon gains a permanentlyClosed param; overrides fill/icon/border when true)
  - src/app/explore/ExploreMapWidget.tsx (computes isAttractionPermanentlyClosed per marker, passes it through, appends tooltip text)
  - src/components/AttractionGridCard/AttractionGridCard.tsx (computes the same flag; grayscale photo + red overlay banner when closed)
  - src/components/AttractionGridCard/AttractionGridCard.module.css (new .photoAreaClosed/.closedOverlay/.closedBanner styles)
- Deviations from task requirements: none
- New design tokens used: CLOSED_MARKER_COLOR (#DC2626) added to mapIcons.constants.ts — not a new color, it's the existing --color-error value, just needed as a JS constant since Leaflet DivIcon HTML can't reference CSS custom properties from outside the page's own stylesheet context the same way
- Verification: tsc clean (after clearing a stale .next cache referencing the already-deleted admin-messages routes, unrelated to this change); eslint identical to pre-existing baseline (2 set-state-in-effect errors + 1 unused-var warning, all confirmed pre-existing); live-verified against a real permanently-closed attraction ("Fernando's Café @ Carfax", Oxford) — grid card shows a grayscale photo with a red "PERMANENTLY CLOSED" banner, map view shows a solid red pin with a white Ban icon clearly distinct from the surrounding type-colored pins

## Completion Summary
Permanently closed attractions now show a grayscale photo + red "PERMANENTLY CLOSED" banner in grid view, and a solid red Ban-icon pin in map view, both verified live against a real attraction. Auto-closed per the user's "commit and push when done" instruction.
