# Task: Refresh Explore's current view after editing an attraction

Status: done

Track: B
Track reason: state-reconciliation bug fix in existing Explore logic (which arrays get updated/filtered after a save) — no new UI surface, no visual change.

## Problem
In `/explore`, editing an attraction (via `NewAttractionModal`'s edit mode) doesn't fully refresh the view the user is currently looking at. Specifically: if the edit changes the attraction's **city** (or country), the attraction should move to reflect its new location — disappear from the old city/country view, appear in the new one, and the world/country city-lists and map pins should update accordingly. More generally, any edited field should be reflected immediately in whichever view (world, country, or city; map or grid) the user is currently on, without a manual reload.

## Goal
After saving an edit to an attraction in Explore, the current view (world/country/city, map/grid, city list, country list) reflects the change immediately and correctly — including an attraction moving out of the current view entirely if its city/country changed away from what's selected.

## Requirements
- If the edited attraction's city/country no longer matches the currently selected city/country, it disappears from the current view's list/map/grid.
- If the edited attraction's city/country now matches (e.g. edited to move into the currently selected city), it should appear correctly — TBD after investigation whether this is in scope or a "leaves the old view" case is the priority.
- All other field edits (name, photo, price, types, etc.) already reflected live, or fixed to do so.
- The world-view city/country lists (names, per-city/country counts) reflect the change without requiring a manual page refresh.
- Map pins update to match (no stale pin at the old location, no missing pin at the new one).

## Constraints
- Existing state architecture in `src/app/explore/ExploreClient.tsx`: `cityAttractions`, `countryAttractions`, `cities` (world-view list) are separate pieces of state populated by separate fetches (`getAttractionsByCity`, `getAttractionsByCountry`, `getCities`). `handleEditSave` currently patches `cityAttractions`/`countryAttractions` in place by `_id` match — doesn't handle the attraction moving out of the current city/country, and doesn't touch the `cities` list at all.

## Out of scope
- Changes to the underlying edit modal/form itself (`NewAttractionModal`) — this task is about Explore's post-save state reconciliation only.

## Implementation Notes
- Files modified: `src/app/explore/ExploreClient.tsx` — `handleEditSave` now:
  - Filters the edited attraction out of `cityAttractions`/`countryAttractions` when its new `city`/`country` no longer matches `selectedCity`/`selectedCountry` (previously an unconditional `.map()` left a stale entry behind); otherwise updates it in place as before — this covers both the list/grid and the map (which renders from these same arrays).
  - Triggers `setCitiesReloadKey` (existing mechanism) to re-fetch the world-view city/country list whenever the edit's `city` or `country` differs from the pre-edit values — keeps per-city/country counts and the city list itself (new city appearing, emptied city disappearing) correct without a manual reload.
- "Newly matching" case from the requirements turned out to be unreachable in practice: an attraction can only be edited from a view it's already visible in (edit is only reachable via `AttractionDetailModal`, opened from the currently-rendered `cityAttractions`/`countryAttractions`), so there's no scenario where a save needs to *add* an attraction to the current view — only leave it in place or remove it.
- Deviations: none.
- New design tokens used: none — no UI changes.
- Verified live via Playwright against the real dev server/DB: seeded a debug attraction in `OldCity`, opened it from Explore's `OldCity` grid view, edited its `city` to `NewCity` via the edit modal, and confirmed: the attraction disappeared from the `OldCity` view immediately ("0 of 0 attractions"), and the world-view country list correctly showed `NewCity` (1) with `OldCity` gone entirely (0 attractions after the move). Cleaned up debug data and the temporary script afterward.
- Observed but not investigated: a `Cannot read properties of undefined (reading '_leaflet_pos')` console error surfaced during the verification run's map/grid view switching. It didn't affect correctness (data shown was accurate throughout) and reproduces during ordinary view-toggling unrelated to this fix's code path (marker mount/unmount is handled by react-leaflet's own reconciliation, not touched by this change) — most likely a pre-existing Leaflet/react-leaflet timing quirk. Flagging for awareness, not fixing here (out of scope for this task).

## Completion Summary
Fixed `ExploreClient.handleEditSave` so editing an attraction's city/country now correctly updates whichever Explore view (city/country list, map, grid) the edit happened in — including removing the attraction from the current view when it no longer belongs there, and refreshing the world-view city/country counts. Verified live end-to-end. Confirmed by user. Closed 2026-08-24.
