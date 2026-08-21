# Task: Nearby attraction planner — suggest & add attractions within a drive-time radius

Status: done
Track: A
Track reason: new multi-step interaction (pick attraction → popup of nearby suggestions → add to trip), no existing pattern in this codebase

## Problem
When planning a trip, a user who's already committed to visiting one attraction has no quick way to discover other attractions near it worth adding — they'd have to eyeball the map or manually check each candidate's distance.

## Goal
From the trip's Explore tab ([[trip-explore-tab-with-filters]]), a button lets the user pick one of the trip's attractions, then see a popup listing other attractions within a chosen max drive time of that location, filterable the same way as the Explore tab, with a way to add any of them to the trip directly from the popup.

## Requirements
- A button labeled **"Discover Nearby"** (confirmed with the user) — placed on the Explore tab.
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

## Design Brief

Next.js web app, CSS Modules. No new visual tokens needed — reuses `ModalShell`, `AttractionFilter`, and existing button/chip styles.

**Confirmed ground truth (researched, not assumed):**
- **No geo/proximity query exists anywhere in this codebase.** `GET /api/attractions` (`searchAttractions`, `src/lib/services/attractions.service.ts`) only filters by `country`/`city`/`q`/`type`/`ownerId` — no coordinate-based filter, no geospatial index. Attractions do carry `coordinates`, just nothing queries by them yet.
- **No batch/matrix routing endpoint exists.** `fetchRouteLeg(from, to, mode, date?)` (`src/services/routeTransit.service.ts`) is one origin→destination pair per call (Valhalla for car/walk, Transitous for transit) — calling it once per candidate attraction is the only option.
- **No haversine/straight-line-distance helper exists** anywhere in `src/lib/` — write a small new one (e.g. `src/lib/geo.ts`, a pure function `haversineKm(a: {lat,lng}, b: {lat,lng}): number`).
- **Adding an existing attraction to the trip** needs only `{ existingAttractionId: string, plannedDate?, plannedTime?, allowDuplicate? }` posted via the existing `addAttractionToTrip(tripId, token, payload)` client service (`src/services/attractions.service.ts`) → `POST /api/trips/[id]/attractions` — no new fields, no new endpoint. `plannedDate`/`plannedTime` can be omitted (adds it unscheduled, same as picking a place from the sidebar without assigning a day) unless you want to default it onto the same day as the origin attraction (nice-to-have, not required).
- **`AttractionPickerModal` is not a fit for the "pick origin attraction" step** — it's a multi-select, global-in-memory-catalog picker with its own hand-rolled modal chrome (not `ModalShell`), no distance data, and name+country+city-keyed dedup rather than id-based. Don't try to adapt it; build a small new single-select list using `ModalShell` instead, listing the trip's own attractions (reuse `regularAttractions`/the Explore tab's attraction list already in `TripDetailClient.tsx` — this is exactly why the task requirements lean toward "the trip's own list first").
- **`ModalShell`** (`src/components/Modal`) is the right wrapper for both new popups (origin picker, results list) — same component every other modal in this app already uses (`isOpen`, `onClose`, `styles`, `header`, `children`, `footer?`, `headingId`).

**Candidate pool & drive-time filtering strategy** (since no geo query exists, this must be assembled client-side/on-demand, not via a new dedicated backend endpoint — keep it simple):
1. Once the user picks an origin attraction, fetch candidates scoped to that attraction's **city** via the existing `GET /api/attractions?city=...&country=...&includeHidden=true` (same call `ExploreClient.tsx`/`TripDetailClient.tsx` already make elsewhere) — this bounds the pool to a sane size (a city, not the whole database) without needing any new query capability.
2. Exclude the origin attraction itself and any attraction already on this trip (compare against the trip's own attraction ids).
3. Apply the new `haversineKm` helper as a coarse pre-filter — generous radius (e.g. straight-line distance ≤ 1.5× what the max drive-time setting could plausibly cover at ~40 km/h average urban speed) to shrink the candidate list before hitting the routing API.
4. Call `fetchRouteLeg(origin.coordinates, candidate.coordinates, "car")` **in parallel** (`Promise.all`, not sequential — city-scoped + haversine-filtered pool should be small enough, typically dozens not hundreds) for the remaining shortlist.
5. Keep only results where `durationSec <= maxMinutes * 60`, sort by duration ascending.
- Default max drive time: **20 minutes**, user-adjustable (a simple `<input type="number">` or a small preset chip row like "10 / 20 / 30 min" — this app has no slider component, don't build one).

**UI flow:**
1. "Discover Nearby" button on the Explore tab (only meaningful when the trip has ≥1 attraction with coordinates — hide or disable otherwise).
2. Click → `ModalShell` #1: single-select list of the trip's own attractions with coordinates (name + city, simple list, no map needed here — this is a quick picker, not a browsing surface).
3. Pick one → `ModalShell` #2 (or reuse the same modal, transitioning content): shows the max-drive-time control, the `AttractionFilter` (category/type, same wiring pattern as the Explore tab) applied to the *results* list, and the sorted list of nearby suggestions — each row shows name, drive time (`formatLegDuration`, already exported by `routeTransit.service.ts`), and an "Add to trip" button that calls `addAttractionToTrip` and updates the row to a confirmed/added state (disable the button, don't just silently remove the row — the user should see it worked before the list potentially shifts).
4. Loading state: fetching + routing candidates takes real time (network calls) — show a spinner/loading state in the popup, not a blank list.

**Constraints carried over:** don't build a new backend geo-query endpoint or a distance-matrix batch API — this must work within the existing single-pair routing service and existing city-scoped attraction query. Don't add a slider component or any new form-control primitive not already in this codebase.

## Implementation Notes
- Files created/modified:
  - `src/lib/geo.ts` (new) — `haversineKm(a, b)`, straight-line distance in km. Exported via `src/lib/index.ts`.
  - `src/components/NearbyAttractionsModal/` (new component, full structure): `.tsx`, `.module.css` (mirrors `AddCustomSlotModal.module.css`'s modal-shell CSS plus new list/row/pagination/warning styles), `.utils.ts` (`prefilterCandidates`, `runWithConcurrencyLimit`, `findNearbySuggestions`), `.constants.ts` (`DEFAULT_MAX_MINUTES=20`, `MAX_MINUTES_PRESETS=[10,20,30]`, `MAX_ROUTING_CANDIDATES=20`, `ROUTING_CONCURRENCY=3`), `.types.ts`, `index.ts`. Exported via `src/components/index.ts`.
  - `src/app/trips/[id]/TripDetailClient.tsx` — added `nearbyModalOpen` state, a "Discover Nearby" button (`Compass` icon, gated by `effectiveCanEdit` and requiring at least one attraction with coordinates) in the Explore tab header, and the `<NearbyAttractionsModal>` render wired to `upsertAttraction` for the add-to-trip callback.
- Deviations from brief: two additions beyond the brief, both requested by the user after initial implementation (see Revision below) — free-text search + pagination on both the origin picker and results lists, and a rate-limit fix (see below) that wasn't anticipated by the brief.
- New design tokens used: none — reused the full existing token set (`--color-primary`, `--color-primary-light`, `--color-primary-dark`, `--color-accent-dark`, `--color-border`, `--color-error`, `--color-success`, `--radius-md/full/xl`, `--duration-fast/base/slow`, `--easing-out`, `--shadow-xl`).
- Verified live via a real browser against a seeded Budapest-based trip: non-owner correctly never sees the button; owner sees it, picks an origin, gets a results list sorted by drive time, adds one successfully (button becomes a disabled "Added" state), and free-text search correctly narrows/empties the results list.

## Revision 1 (found during live verification — routing service rate-limiting)
The initial implementation's unthrottled `Promise.all` across the full haversine-filtered candidate list hit the public Valhalla routing instance's rate limit (`429 Too Many Requests`) on every single candidate for a moderately dense city (Budapest), silently dropping all of them — the UI then showed "No attractions found," which is a **wrong conclusion** (the truth was "the routing service refused the burst," not "nothing is nearby").

Fixed with two changes:
- `prefilterCandidates` now also caps the shortlist to the closest `MAX_ROUTING_CANDIDATES` (20) by straight-line distance, not just "everything inside the radius" — a dense city can have far more candidates inside a generous radius than it's reasonable to route-check at all.
- `findNearbySuggestions` now routes through a small concurrency-limited worker pool (`ROUTING_CONCURRENCY=3`) instead of firing every call at once, and returns `{ suggestions, failedCount }` instead of silently dropping failures. The UI shows a distinct amber "Couldn't check N nearby places (routing service busy) — try again in a moment" notice whenever `failedCount > 0`, so a partial/rate-limited batch reads as incomplete, not as "confirmed empty."
- Re-verified live: even with some 429s still occurring (the public instance is strict), the search now returns real partial results (5 in the test run) with the notice correctly shown for the rest, instead of a total silent failure.

## Revision 2 (user feedback before this round of verification)
User asked for pagination and free-text search on the available-attractions lists. Added:
- Origin picker (step 1): a plain `<input>` search box filtering the trip's own attractions by name, plus Previous/Next pagination (reusing `ATTRACTIONS_PAGE_SIZE` from `@/config/ui`, same page size as the rest of the app).
- Results (step 2): un-hid `AttractionFilter`'s built-in search field (was `hideSearch`) and wired it to filter the suggestion list by name, plus the same Previous/Next pagination pattern.

## Completion Summary
Added a "Discover Nearby" flow to the trip Explore tab: pick one of the trip's own attractions, see other nearby attractions within an adjustable drive time (with search/pagination/category/type filtering), and add any of them to the trip directly. Root-caused and fixed a routing-service rate-limit bug found during live verification (throttled batching + a visible partial-failure notice instead of a silent empty result). Confirmed by the user and closed 2026-08-21.
