# Task: Fix Attraction Price and Currency Not Saving on Edit

Status: done

Track: B
Track reason: Bug fix — form field values not persisted on update

## Problem
When a user edits an existing attraction, changes to the price field and the currency field are not saved. The fields may not be present in the edit form at all, or the values are not included in the PUT request payload.

## Goal
Editing an attraction correctly saves the updated price and currency alongside all other fields.

## Requirements
- The attraction edit form (via `NewAttractionModal` or equivalent) must show the current price value pre-filled
- Changes to price must be included in the PUT request to `/api/attractions/[id]`
- If the attraction has a currency field, it must also be editable and saved
- No regressions to other editable fields (name, city, country, types, duration, opening hours, notes, photoUrl)

## Constraints
- Must use CSS Modules — no inline styles
- Fix must be server-side (API) and client-side (form) if both are missing the field

## Out of scope
- Changing the visual design of the price/currency fields
- Adding currency to attractions that don't already have it in the schema

## Implementation Notes
- Files modified: `src/app/api/attractions/[id]/route.ts`
- Root cause: PUT handler used `Attraction.findOne({ _id, ownerId: userId })` — silently returns 404 when the requester isn't the original attraction creator (which happens when the same attraction document is reused across users via the name-dedup pattern). Price was being sent correctly by the client; it simply never reached the DB.
- Fix: Changed to `findById(id)` + explicit access check: update allowed if the user owns the attraction OR owns/collaborates on a trip that contains it.
- Currency field does not exist on the Attraction schema (out of scope per task); no schema or client changes were needed.
- Deviations from brief: none
- New design tokens used: none

## Completion Summary
Fixed the silent 404 failure in `PUT /api/attractions/[id]` that prevented any user other than the original attraction creator from saving edits. The PUT handler was looking up the attraction by `{ _id, ownerId: userId }` — failing for trip owners and collaborators who added a reused attraction. Switched to `findById` + a trip-membership check. Confirmed by user on 2026-07-05.
