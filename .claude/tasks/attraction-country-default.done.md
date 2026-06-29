# Task: Attraction Country Default

Status: done

Track: B
Track reason: logic change only — pre-fill and lock one field in the existing NewAttractionModal; no new visual surface

## Problem
When a traveler adds an attraction inside a trip, they're shown a full "New Attraction" form where `Country` is blank and fully editable. Since they're adding an attraction *for that trip*, the country should always be the trip's destination country — asking them to re-select it is redundant and error-prone.

## Goal
When `NewAttractionModal` is opened from within a trip context, the `country` field is pre-filled with the trip's country and is read-only (non-editable).

## Requirements
- `NewAttractionModal` already accepts `isOpen`, `onClose`, `onSave` props
- Add an optional `defaultCountry?: string` prop to `NewAttractionModal` and `NewAttractionModalProps`
- When `defaultCountry` is provided:
  - The `country` select (or input) is pre-filled with that value
  - The field is rendered as read-only / disabled so the user cannot change it
  - Visually distinguish it as read-only (use existing `disabled` opacity pattern from the design system: `opacity: 0.6; pointer-events: none` on the select wrapper, or replace with a plain read-only text display)
- When `defaultCountry` is not provided (standalone modal via Navbar or elsewhere), the field behaves exactly as today (editable, blank)
- `TripDetailClient.tsx` passes `defaultCountry={trip.country}` when opening the modal

## Constraints
- CSS Modules only, no inline styles
- No new visual patterns — use existing `disabled` / read-only styling already in the system
- The `city` field remains editable (the attraction is in the country but the city varies)

## Out of scope
- Locking the city field
- Adding the country as a locked field in the standalone navbar flow

## Completion Summary
Country default and lock for attractions confirmed by user on 2026-06-29. `NewAttractionModal` now accepts an optional `defaultCountry` prop that pre-fills and locks the country field to a read-only display; `TripDetailClient` passes the trip's country automatically.

## Implementation Notes
- Files modified: `src/components/NewAttractionModal/attraction.types.ts` (added `defaultCountry?`), `src/components/NewAttractionModal/NewAttractionModal.tsx` (destructure prop, init state from it, reset to it, conditional field render), `src/components/NewAttractionModal/NewAttractionModal.module.css` (added `.readOnlyField`), `src/app/trips/[id]/TripDetailClient.tsx` (pass `defaultCountry={trip.country}`)
- Deviations from task requirements: none
- New design tokens used: none
