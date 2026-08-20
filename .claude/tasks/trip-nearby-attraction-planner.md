# Task: Nearby attraction planner — suggest & add attractions within a drive-time radius

Status: intake
Track: A
Track reason: new multi-step interaction (pick attraction → popup of nearby suggestions → add to trip), no existing pattern in this codebase

## Problem
When planning a trip, a user who's already committed to visiting one attraction has no quick way to discover other attractions near it worth adding — they'd have to eyeball the map or manually check each candidate's distance.

## Goal
From the trip's Explore tab ([[trip-explore-tab-with-filters]]), a button lets the user pick one of the trip's attractions, then see a popup listing other attractions within a chosen max drive time of that location, filterable the same way as the Explore tab, with a way to add any of them to the trip directly from the popup.

## Requirements
- A button (name TBD — brief says "Plan" reads ambiguously here since "Plan" already means the itinerary/calendar elsewhere in this app; pick something clearer during implementation, e.g. "Find Nearby", "Suggest Nearby", "Discover Nearby" — confirm with the user if unsure) — placed on the Explore tab.
- Clicking it prompts the user to choose one attraction (from the trip's own attractions, or possibly the wider attraction library — decide scope during implementation; likely the trip's own list first, matching the Explore tab's data).
- After a pick, show a popup/modal listing attractions within a max drive time (a user-adjustable "X min" — decide a sensible default, e.g. 15 or 20 min) of the chosen attraction's coordinates.
  - Drive time: use the existing routing service (`src/services/routeTransit.service.ts`, `fetchRouteLeg(from, to, "car")` — returns `durationSec`) rather than building new routing logic. Calling it per-candidate for a large attraction pool may be slow — consider a coarse straight-line (haversine) pre-filter to a generous radius before calling the routing API only on the shortlist, rather than querying every attraction in the database. Decide the exact candidate pool during implementation (the trip's country/city? all known attractions near that point via an existing API like `/api/attractions`?).
  - Reuse `AttractionFilter` (`src/components/AttractionFilter`) inside the popup for type/category filtering of the suggestions, consistent with the Explore tab.
- Each suggested attraction in the popup can be added to the trip directly (reuse the existing "add attraction to trip" flow/service, e.g. `addAttractionToTrip` — see `CalendarSection.tsx`/`TripDetailClient.tsx` for the existing pattern) without leaving the popup.

## Constraints
- Depends on [[trip-explore-tab-with-filters]] being built first (shares its map/filter UI and attraction-picking interaction).
- Don't build a new routing/distance system — use the existing `fetchRouteLeg`/Valhalla-backed service.

## Out of scope
- Suggesting attractions not already in the app's attraction database (no new-place discovery/search integration).
- Multi-attraction "pick a route through several places" planning — this is single-origin nearby suggestions only.
