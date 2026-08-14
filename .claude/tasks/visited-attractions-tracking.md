# Task: Personal "Visited" Tracking for Attractions

Status: intake

Track: A
Track reason: New per-user data relationship (nothing like it exists on `User` today), a new interactive control (toggle) that needs a placement/visual design across several existing card/list/modal components, plus a new filter control on the Explore page — none of this is covered by existing design tokens as a ready-made pattern.

## Problem
Attractions are global, shared entities reused across many trips and many users (`src/models/Attraction.ts` — no `tripId`, no `ownerId`-based visibility restriction beyond the existing private-trip hiding). Right now there's no way for a user to record "I've actually been to this place" as a personal fact, independent of which trip(s) it's linked to or who added it. A user wants to mark places they've personally visited (in real life, from any trip they were ever part of, or discovered via Explore) and later filter Explore down to just the places they've visited — e.g. to revisit favorites or avoid re-suggesting places to themselves.

## Goal
1. A user can mark/unmark any attraction as "visited" — a purely personal flag, not shared with other users, not tied to a specific trip.
2. The visited state is visible and toggleable everywhere a user can see attraction details (at minimum: `AttractionDetailModal`, the trip Attractions tab list, and the Explore city-drill-down attraction cards).
3. The Explore page has a "visited only" filter that narrows results to attractions the current user has marked visited.

## Requirements

**Data model**
- Add `visitedAttractionIds: Types.ObjectId[]` (ref `Attraction`) to `src/models/User.ts` — no existing precedent for an array-of-refs field on `User`, so this is new (mirrors the pattern already used for `Trip.attractionIds`).
- New endpoints to toggle visited state for the authenticated user, e.g. `POST /api/users/me/visited/:attractionId` (mark visited) and `DELETE /api/users/me/visited/:attractionId` (unmark) — or a single `PUT` that accepts the desired boolean, whichever fits the codebase's existing REST conventions better (check `src/app/api/` for the established pattern before deciding). Update `swagger.yaml` accordingly (hard rule).
- Every response that includes attractions and is served to an authenticated user must attach a per-user `isVisited: boolean` — follow the same "merge a per-request/per-user override onto the shared doc" pattern already used for `schedule` in `formatAttraction()` (`src/models/Attraction.ts`). This applies to: `GET /api/attractions` (search/Explore), `GET /api/trips/:id/attractions` (trip list), and any other endpoint returning `Attraction`/`AttractionShape` objects to a logged-in user. For unauthenticated callers, `isVisited` should simply be `false`/absent — visited status requires a logged-in user.
- Add `isVisited?: boolean` to the client `Attraction` type (`src/types/attraction.ts`).

**UI — toggle control**
- `src/components/AttractionDetailModal/AttractionDetailModal.tsx`: add a "Mark as visited" / "Visited ✓" toggle button in the footer, alongside the existing conditional action buttons (`onAddToTrip`, `onEdit`) — same prop-driven pattern (`isVisited`, `onToggleVisited`).
- Trip Attractions tab (`src/app/trips/[id]/TripDetailClient.tsx`, the `paginatedAttractions` list, ~line 799 per investigation) — add a compact visited indicator/toggle on each row (design should decide: icon button vs. checkbox vs. small chip — keep it unobtrusive, this list already has edit/remove row actions).
- Explore city-drill-down attraction cards (`src/app/explore/ExploreClient.tsx` and wherever it renders attraction cards for a city) — same toggle, compact form.
- Toggling from any of these surfaces must update in real time everywhere else that attraction is currently rendered in the same session (standard optimistic-update pattern already used elsewhere in this app, e.g. `TripDetailClient.tsx`'s `upsertAttraction`).

**UI — Explore filter**
- Add a "Visited only" filter toggle to Explore's existing filter UI (`AttractionFilter`/`AttractionTypePicker` per the investigation, in `ExploreClient.tsx`) — client-side filter on the already-fetched attraction list is sufficient (matches the existing category-filter precedent, which is also client-side per the investigation), no new server query param required unless the designer/developer finds the result set is too large to filter client-side for some view.
- Only show this filter when the user is logged in (visited status doesn't exist for anonymous users).

## Constraints
- `isVisited` is inherently per-user, per-attraction — never write it onto the shared `Attraction` document itself (same rule this app already follows for `Trip.schedules` overrides — don't repeat the mistake of writing trip-specific/user-specific data onto a shared global doc).
- Toggling visited must not affect `Trip.attractionIds`/`Trip.schedules` in any way — it's a completely separate relationship (User ↔ Attraction, not Trip ↔ Attraction).
- Keep the toggle interaction fast/optimistic — don't block the UI on the API round-trip for every list this attraction appears in.

## Out of scope
- Any kind of "visited" social feature (showing OTHER users' visited attractions, visited counts/leaderboards, etc.) — this is a private, personal flag only.
- Visited date/timestamp tracking (just a boolean for now — "have you been here," not "when")
- Retroactively auto-marking attractions as visited based on trip dates having passed — this is manual/user-driven only
