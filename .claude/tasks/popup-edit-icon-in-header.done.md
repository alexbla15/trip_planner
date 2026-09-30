Status: done
Track: B

## Completion Summary
Confirmed by user 2026-09-30.

## Request
Move "Edit attraction details" to the popupHeader as an icon button.

## Fix
`src/app/trips/[id]/CalendarSection.tsx`: moved the edit button from a
labeled button in `.popupBody` into `.popupHeader`, as an icon-only button
(pencil icon, `aria-label`/`title` carry the label) placed between the
title and the close button — same ownership gate as before.
`src/app/trips/[id]/CalendarSection.module.css`: replaced `.popupEditBtn`
with `.popupEditIconBtn`, styled to match `.popupClose`'s icon-button family
(24x24px, translucent-white background on the colored header).

## Implementation Notes
- `tsc --noEmit`: clean.
- Verified live via Playwright: the icon button renders in the header next
  to close, the old body text-button is gone, and clicking it still opens
  the full attraction editor correctly prefilled.
