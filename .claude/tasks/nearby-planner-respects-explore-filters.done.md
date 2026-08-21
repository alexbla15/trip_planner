# Task: "Discover Nearby" origin picker respects Explore tab filters

Status: done
Track: B
Track reason: logic/data change to an existing picker's candidate list — no new UI surface, reuses existing filter state already computed in TripDetailClient.

## Problem
On `trips/[id]?tab=explore`, the "Discover Nearby" button opens `NearbyAttractionsModal`, whose origin-picker (step 1, "Pick one of this trip's attractions") currently lists every regular attraction on the trip (`tripAttractions` prop = `regularAttractions`), ignoring the Explore tab's own active filters (day picker, category picker, type picker). A user who has filtered the Explore view down to a specific day/category/type still sees the full unfiltered list when picking an origin, which is inconsistent with what they're currently looking at on the map.

## Goal
The origin-picker list in "Discover Nearby" only offers attractions that match the Explore tab's currently active day + category + type filters — i.e. the same set already computed as `exploreFilteredAttractions` in `TripDetailClient.tsx`.

## Requirements
- Pass the already-filtered list (`exploreFilteredAttractions`, or equivalent) into `NearbyAttractionsModal` as the origin-picker's candidate list, instead of the full `regularAttractions`.
- The "exclude already-added attractions from nearby results" behavior (results step, not the origin picker) must keep using the full trip attraction set — only the *origin-picker* list should be filtered by the Explore tab's active filters, not the "what's already on the trip" exclusion used later.
- If the filtered list is empty (filters exclude every attraction), the origin picker should show its existing empty state, not error.

## Constraints
- `NearbyAttractionsModalProps.tripAttractions` is currently used for two purposes inside the modal — verify both call sites in `NearbyAttractionsModal.tsx`/`.utils.ts` before changing what's passed in, so the exclusion-list behavior doesn't get accidentally narrowed too.
- Reuse `exploreFilteredAttractions`, computed once in `TripDetailClient.tsx` already — don't duplicate the day/category/type filter logic.

## Out of scope
- Changing what filters exist on the Explore tab itself.
- Changing the results-step filtering (category/type filter within the nearby-results list) — that's a separate, already-existing filter.

## Implementation Notes
- Files created/modified: `src/components/NearbyAttractionsModal/NearbyAttractionsModal.types.ts` (new `originAttractions` prop, doc comments clarifying the split between it and `tripAttractions`), `src/components/NearbyAttractionsModal/NearbyAttractionsModal.tsx` (origin-picker list now built from `originAttractions` instead of `tripAttractions`; exclusion-set logic in `runSearch` untouched, still reads the full `tripAttractions`), `src/app/trips/[id]/TripDetailClient.tsx` (passes `originAttractions={exploreFilteredAttractions}`, keeps `tripAttractions={regularAttractions}`).
- Deviations from brief: none.
- New design tokens used: none (Track B, no new UI).
- Verified live: seeded a trip with one attraction on day 1 and two on day 2, filtered the Explore day picker to day 1 only, opened "Discover Nearby" — origin picker showed exactly the one day-1 attraction.

## Completion Summary
The "Discover Nearby" origin picker on the trip Explore tab now only lists attractions matching the tab's active day/category/type filters (`exploreFilteredAttractions`), instead of every attraction on the trip — while the separate "already on this trip" exclusion used when searching for nearby suggestions still correctly checks the full, unfiltered trip attraction list. Confirmed by the user 2026-08-21.
