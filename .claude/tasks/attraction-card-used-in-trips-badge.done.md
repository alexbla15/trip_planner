# Task: Show "used in one of my trips" on the attraction card

Status: done
Track: A
Track reason: new visual affordance (a badge/indicator) on AttractionDetailModal that doesn't exist in the design system yet — needs a Design Brief for placement/styling, even though the backend pattern to compute the data is a close copy of the existing `isVisited` merge.

## Problem
`AttractionDetailModal` already shows a per-user "visited" toggle (`isVisited`/`onToggleVisited`, computed via `visited.service.ts`'s `getVisitedIdSet`/`isAttractionVisited` and merged onto attraction API responses). There's no equivalent signal for whether the attraction has already been added to one of the current user's own trips — a user browsing Explore or a nearby-attractions search has no way to tell, from the card alone, "I already planned this on Trip X" without leaving the modal and checking.

## Goal
The attraction detail card shows, for a logged-in user, whether the attraction is already used in one (or more) of their own trips — and which trip(s), if reasonably shown.

## Requirements
- Backend: a per-user computed field, following the exact pattern of `getVisitedIdSet`/`isAttractionVisited` in `src/lib/services/visited.service.ts` — but querying `Trip.attractionIds` (see `src/models/Trip.ts:57`) scoped to trips owned by (or the user collaborates on — confirm which) the current user, instead of `User.visitedAttractionIds`.
- Merge this onto the same attraction response shape `isVisited` already rides on (`formatAttraction`), so every existing consumer of that shape (Explore page, trip Explore tab, nearby-attractions planner, admin) gets it without a second round-trip.
- UI: `AttractionDetailModal` shows a badge/section when the attraction is used in >=1 of the user's own trips. Needs a Design Brief for: badge placement relative to the existing visited-toggle button, whether to name the trip(s) or just show a count/generic "Already in your trips" state, and behavior when the list of trip names is long.
- Anonymous (logged-out) users: no badge shown — mirrors `isVisited`'s existing anonymous-caller behavior (returns false/empty rather than erroring).

## Constraints
- Reuse the exact merge pattern already established for `isVisited` — don't invent a second convention for per-user computed attraction fields.
- Must not add a second query per attraction in a list (city/country attraction lists can be large) — batch via a Set/Map the same way `getVisitedIdSet` does, not one query per attraction, except for the single-attraction detail fetch path where `isAttractionVisited`'s one-off pattern is fine.

## Out of scope
- Editing/removing the attraction from a trip directly from this badge — display only.
- Showing trips other users have used the attraction in (own trips only).

## Design Brief
- Placement: a compact pill directly below the "Types" chip row, above the location map — reads naturally as part of the card's top summary area, doesn't compete with the header's visited-toggle button (which is a per-user action, not informational).
- Visual: reuses `--color-success` (same token as the visited-toggle's active state) at 12% background tint, full-radius pill, small `Luggage` icon (lucide) — distinct from the neutral `.chip` type badges so it reads as a status, not a category tag.
- Copy: single trip → `Already in your trip "<name>"`; 2+ trips → `Already in N of your trips` with the full comma-separated list in a `title` attribute (native tooltip) rather than a second UI element, since this is a secondary/informational signal.
- Anonymous/no-match: renders nothing (no empty pill, no placeholder).

## Implementation Notes
- Files created/modified:
  - `src/lib/services/usedInTrips.service.ts` (new) — `getUsedInTripsMap`/`getUsedInTripNames`, mirrors `visited.service.ts`'s `getVisitedIdSet`/`isAttractionVisited` pattern exactly, querying `Trip.attractionIds` scoped to `ownerId` = requesting user.
  - `src/types/attraction.ts` — new `usedInTripNames?: string[]` field on the shared `Attraction` shape.
  - `src/models/Attraction.ts` — `formatAttraction` takes a new trailing optional `usedInTripNames` param (same convention as `isVisited`), defaults to `[]`.
  - `src/lib/services/attractions.service.ts` — threaded `usedInTripNames` through every existing `formatAttraction` call site (trip-attractions list, add-to-trip flow x3 branches, update-schedule flow), alongside the `isVisited` resolution already happening at each.
  - `src/app/api/attractions/route.ts`, `src/app/api/attractions/[id]/route.ts` — same threading for the global attraction list/update endpoints.
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` + `.module.css` — new badge, rendered when `usedInTripNames.length > 0`.
  - `swagger.yaml` — documented the new response field.
- Deviations from brief: none — brief was written by the same pass that implemented it (fast-tracked design decision given a close existing precedent).
- New design tokens used: none — reused `--color-success` and `--radius-full`, already in the design system.
- Verified live: added an attraction to two trips, opened its card from a trip's Attractions tab — badge showed "Already in 2 of your trips" with both trip names in the tooltip; confirmed via direct API call that `GET /api/attractions` also returns the field for the global Explore list.

## Completion Summary
Attraction detail cards now show a green "Already in your trip" / "Already in N of your trips" badge (with a hover tooltip listing trip names) whenever the logged-in user has already added that attraction to one of their own trips, backed by a new per-user `usedInTripNames` field merged onto every attraction API response the same way `isVisited` already is. Confirmed by the user 2026-08-21.
