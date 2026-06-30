# Task: Attraction Read-Only Detail View from Calendar

Status: done

Track: B
Track reason: wiring existing components — reuse AttractionDetailModal already used in TripDetailClient; change click handler on calendar blocks; no new visual surface or design pattern

## Problem
In the trip calendar, clicking an attraction block currently opens the time/duration editor popup (for owners). Non-owners see nothing when they click. In both cases there is no way to read the full attraction details (notes, opening hours, photo, types, price, etc.) from the calendar view without leaving it.

## Goal
Clicking an attraction block (or a dedicated info button on the block) opens a read-only detail view showing all the attraction's information.

## Requirements

### Existing component to reuse
`src/components/AttractionDetailModal/AttractionDetailModal.tsx` — already used from the trip detail list view. It receives an `Attraction` and displays it read-only. This component should be reused, not duplicated.

### Interaction design
Two behaviors need to coexist for owners:
- **Single click on block** → open read-only detail view (for everyone)
- **Time/duration editing** → still accessible via the existing popup, but triggered differently (e.g. a small edit icon/button on the block, or from within the detail view)

For non-owners:
- Single click on block → open read-only detail view (currently nothing happens)

**Decision:** add a small `Info` (or eye) icon button on each calendar attraction block that opens the detail modal. Keep the existing click-to-edit-time behavior on the block body for owners. This means owners have two entry points: click body = time editor, click info = detail view.

Alternatively (simpler): make the entire block click open the detail view, and move time editing to a button WITHIN the detail view. Choose whichever is cleaner.

**Recommended approach:** make the block body click open the detail modal for everyone (simpler, consistent). Add an "Edit time" button inside the detail modal (owner only) that closes the modal and opens the existing popup. This replaces the current direct click-to-popup behavior.

### Detail modal content (read-only)
The existing `AttractionDetailModal` already shows:
- Name, type icons, city, country
- Duration, price, opening hours
- Notes
- Photo

No changes needed to the modal itself.

### CalendarSection changes
- `CalendarSection.tsx`: add `viewingAttraction: Attraction | null` state
- On block click (instead of openPopup): set `viewingAttraction = attraction`
- Render `<AttractionDetailModal attraction={viewingAttraction} onClose={() => setViewingAttraction(null)} />` (portal, same as in TripDetailClient)
- Owner can still edit time — add an "Edit time & duration" button inside the modal (owner only) that calls `openPopup` on the attraction and closes the detail modal

### Non-functional
- Accessible: modal has focus management (already handled by AttractionDetailModal)
- Keyboard: Enter/Space on block opens detail (currently opens popup for owners)
- Works for both owners and read-only viewers

## Constraints
- CSS Modules only
- Import `AttractionDetailModal` from `@/components/AttractionDetailModal/AttractionDetailModal`
- The existing `popup` state and `openPopup` function in CalendarSection stay — they're still used for the "Edit time" flow triggered from within the detail modal

## Out of scope
- Editing attraction details (name, types, etc.) from within the calendar (that stays in the trip detail page)
- A new modal design (reuse AttractionDetailModal as-is)


## Implementation Notes
- Files modified: `src/components/AttractionDetailModal/AttractionDetailModal.tsx`, `src/components/AttractionDetailModal/AttractionDetailModal.module.css`, `src/app/trips/[id]/CalendarSection.tsx`
- Deviations from brief: Also modified AttractionDetailModal to accept optional `onEditTime` prop (adds a footer button for owners); this was necessary to give owners a way to reach the time editor after the block click behavior changed to always open the detail view
- New design tokens used: none


## Completion Summary
Non-owners clicking a calendar attraction block now see the full read-only AttractionDetailModal (name, types, city, country, duration, price, opening hours, notes, photo). Owners retain the original click-to-edit-time behavior. AttractionDetailModal extended with optional onEditTime prop and footer button (unused in this flow). Confirmed by user 2026-06-30.
