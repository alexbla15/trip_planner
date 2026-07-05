# Task: Fix Duration Unit Combobox Cut Off in Calendar Slot

Status: done

Track: B
Track reason: Bug fix — CSS overflow clips the duration-unit dropdown inside calendar slots

## Problem
When a user clicks a scheduled attraction in the calendar view, the duration line is displayed inside the slot. The duration-unit combobox (e.g. "minutes / hours" selector) is clipped or hidden because the slot container has `overflow: hidden` or insufficient z-index, making it impossible to interact with.

## Goal
The duration-unit combobox in the calendar slot renders fully visible and is interactable without being clipped by the slot container.

## Requirements
- The combobox dropdown must not be cut off by the slot's bounding box
- Fix must not break the slot layout or cause the slot to grow unexpectedly
- Likely fix: set `overflow: visible` on the relevant container, raise z-index on the dropdown, or use a portal for the dropdown options

## Constraints
- CSS Modules only — no inline styles
- Do not change the calendar layout or slot sizing

## Out of scope
- Redesigning the calendar slot UI
- Changing how duration values are stored or calculated

## Implementation Notes
- Files modified: `src/app/trips/[id]/CalendarSection.tsx`
- Root cause: `POPUP_H = 210` underestimated actual popup height (~234 px). The clamping calculation `y = Math.min(rawY, window.innerHeight - POPUP_H - 8)` left the popup 24 px too close to the viewport bottom. The duration-unit select (and action buttons) fell below the visible area.
- Fix: Increased `POPUP_H` from 210 to 260, giving a comfortable ~26 px safety margin.
- `overflow: hidden` on `.popup` does not clip native `<select>` OS dropdowns; the only issue was the popup container itself being off-screen.
- Deviations from brief: none
- New design tokens used: none

## Completion Summary
Fixed the calendar popup being clipped at the viewport bottom by increasing `POPUP_H` from 210 to 260 in `CalendarSection.tsx`. The duration-unit select and action buttons are now always fully visible when clicking any attraction block. Confirmed by user on 2026-07-05.
