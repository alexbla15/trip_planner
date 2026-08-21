# Task: Refresh "used in trip" badge on /explore after adding an attraction to a trip

Status: reviewing
Track: B
Track reason: bug fix — stale client state after a successful mutation, no new UI surface. Fixes `handleTripSelect` in `src/app/explore/ExploreClient.tsx:552-561`.

## Problem
On `/explore`, adding an attraction to a trip (via the "Add to trip" flow: `AttractionDetailModal` → `TripPickerModal` → `handleTripSelect`) successfully calls `addAttractionToTrip` and shows a success toast, but never updates the attraction's `usedInTripNames` in local state. The blue "used in trip" badge (on the map marker/detail modal and the grid-view card, per `explore-grid-view.done.md`) stays stale — showing "not used in any trip" — until the page is reloaded or re-fetched.

## Goal
Immediately after a successful `addAttractionToTrip` call from `/explore`, the affected attraction's "used in trip" badge updates in place everywhere it's currently rendered (map, detail modal, grid view) — no reload needed.

## Requirements
- In `handleTripSelect` (`src/app/explore/ExploreClient.tsx:552`), on successful `addAttractionToTrip`, append the selected trip's name to that attraction's `usedInTripNames` array (avoid duplicate entries).
- Update every local state array that holds this attraction's record so all views stay in sync — follow the existing pattern used by `handleToggleVisited` (`ExploreClient.tsx:467-502`), which updates `cityAttractions`, `countryAttractions`, and `selectedAttraction` together by matching on `attractionId ?? _id`.
- Match by the attraction's real id (`attractionForTripPicker.attractionId ?? attractionForTripPicker._id`), not by reference, since the same attraction may appear in more than one state array (city/country/selected).

## Constraints
- Reuse the existing state-array update pattern from `handleToggleVisited` — don't introduce a new approach or a full re-fetch.
- No API/schema changes needed — `usedInTripNames` is already returned by the attraction search endpoints; this is a client-side sync fix only.

## Out of scope
- Any change to `addAttractionToTrip`'s API contract or response shape.
- Badge behavior/appearance itself (already implemented per `explore-grid-view.done.md`) — only the refresh timing is broken.

## Implementation Notes
- Files created/modified:
  - `src/app/explore/ExploreClient.tsx` — `handleTripSelect` now, on success, appends the selected trip's name (deduped) to `usedInTripNames` on the matching attraction across `cityAttractions`, `countryAttractions`, and `selectedAttraction`, matched by `attractionId ?? _id`. Mirrors the existing `handleToggleVisited` pattern.
- Deviations from task requirements: none. `usedInTripNames` is typed optional (`string[] | undefined`) on `Attraction`, so the update guards with `?? []` before `.includes`/spread to avoid a runtime crash on an attraction that hasn't had it populated — not called out explicitly in the task but required for correctness.
- New design tokens used: none (no UI change).
- Verified: `tsc --noEmit` and `eslint` clean for the changed lines — `eslint` on the full file surfaces 4 pre-existing errors (useEffect setState-in-effect at lines 306-314, an aria-expanded warning at 861) unrelated to and untouched by this diff (confirmed via `git diff --stat`, 9 lines added, none near those locations).
