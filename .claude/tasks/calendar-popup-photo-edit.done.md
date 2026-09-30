Status: done
Track: A (small feature, existing pattern reused)

## Completion Summary
Confirmed by user 2026-09-30.

## Request
.CalendarSection-module__popup should include picture, and, if user has the
privilege, a button leading to edit the attraction details.

## Implementation
- `src/app/trips/[id]/CalendarSection.tsx`: `PopupState` gained `photoUrl` and
  `ownerId`, populated in `openPopup()` from the attraction. The popup now
  renders a photo (via the shared `ImageWithSkeleton` component, matching
  `AttractionDetailModal`'s own photo pattern) above the time/duration form,
  and — only when the current user owns the attraction (`popup.ownerId ===
  user._id`, the same ownership check used elsewhere, e.g.
  `AttractionGridCard`) and a new `onEditAttraction` prop is supplied — an
  "Edit attraction details" button that looks the attraction up in `local`
  and calls `onEditAttraction(attraction)`.
- `src/app/trips/[id]/TripDetailClient.tsx`: passes `onEditAttraction=
  {setEditingAttraction}` to `<CalendarSection>` — reuses the trip page's
  existing edit-attraction state/NewAttractionModal wiring (already used by
  the flat "Attractions" tab and the AttractionDetailModal's own edit button)
  rather than duplicating an editor instance inside CalendarSection.
- `src/app/trips/[id]/CalendarSection.module.css`: added `.popupPhoto`/
  `.popupPhotoImg` (100px fixed-height photo strip) and `.popupEditBtn`.

## Implementation Notes
- `tsc --noEmit`: clean.
- Verified live via Playwright: seeded a throwaway admin-owned attraction
  with a photo, scheduled it on a test trip, opened its calendar popup as
  the owning admin — confirmed the photo renders, the edit button appears,
  and clicking it opens the full attraction editor correctly prefilled with
  the attraction's name (and by extension the rest of `attractionToFormData`,
  already exercised by the existing edit flow this reuses). Cleaned up the
  test trip/attraction after.
- Not separately verified: the button correctly staying hidden for a
  non-owning user (follows directly from the same `ownerId === user._id`
  check already relied upon elsewhere in the app — not re-tested here).
