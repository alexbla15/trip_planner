# Task: Explore the World from DB

Status: done

Track: B
Track reason: data wiring — new API endpoint + replace mockExplore import with live fetch; no new visual surfaces

## Problem
The "Explore the World" section on the dashboard uses a hardcoded `mockExplore` array of fake destinations (Santorini, Bangkok, Kyoto…). New trips that users create never appear there, making the explore section feel static and disconnected from the real platform.

## Goal
Replace `mockExplore` with live trip data from the database, surfacing real trips created by all users so the explore section reflects actual platform activity.

## Requirements

### Backend — `GET /api/explore`
- Public endpoint (no auth required)
- Returns an array of `ExploreItem`-shaped objects from the `Trip` collection:
  ```ts
  { id: string, destination: string, coverImage: string, tag: string, user: string, likes: number }
  ```
  Map from Trip fields:
  - `id` → `trip._id`
  - `destination` → `trip.name` (trip name, e.g. "Summer in Rome")
  - `coverImage` → `trip.coverImage` (skip trips without a cover image)
  - `tag` → first item of `trip.moods[]` (or "Hidden Gems" as fallback)
  - `user` → `trip.ownerId` stringified (will show as user ID until profile names are wired — acceptable for now)
  - `likes` → `trip.attractionIds.length` (number of attractions as a proxy for engagement)
- Filter: only return trips that have a `coverImage` (skip trips with no photo)
- Sort: newest first (`createdAt: -1`)
- Limit: 24 results max
- Create `src/app/api/explore/route.ts`

### Frontend
- `ExploreSection` already accepts `items: ExploreItem[]` as a prop
- `src/app/page.tsx` (dashboard) currently imports `mockExplore`; replace with a `useEffect` fetch of `GET /api/explore` on mount — no auth header needed since the endpoint is public
- Show existing shimmer skeleton (or a simple loading state) while fetching; fall back to empty state if response is empty
- Mark `src/data/mockExplore.ts` as `@deprecated` with a JSDoc comment (do not delete)

## Constraints
- `ExploreItem` type in `src/types/trip.ts` must remain unchanged (the API response must match it)
- The `user` field will show the ownerId string for now — acceptable until user profiles are linked

## Completion Summary
Explore from DB confirmed by the user on 2026-06-29. New public `GET /api/explore` endpoint returns up to 24 trips with cover images from the database. Dashboard now fetches live explore data. A follow-up bug fix extended `ExploreItem` with `tags: string[]` so multi-mood trips appear under all their vibe filter chips, not just the first.

## Implementation Notes
- Files created: `src/app/api/explore/route.ts`
- Files modified: `src/app/page.tsx` (replaced `mockExplore` import + added `exploreItems` state + `useEffect` fetch), `src/data/mockExplore.ts` (`@deprecated` JSDoc)
- Deviations from task requirements: none
- New design tokens used: none

## Out of scope
- Likes / reactions system
- User display names in explore cards (covered in personal-profile-page task)
- Pagination beyond the 24-item limit (the ExploreSection already has client-side pagination)
