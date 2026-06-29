# Task: Trips API & Frontend Wiring

Status: done

Track: B
Track reason: API Route Handlers + data-layer swap; no new visual surfaces — existing pages keep their layout, they just fetch real data instead of importing mockTrips

## Problem
All trip data is imported from `src/data/mockTrips.ts`. Real trips need to be stored in MongoDB and scoped to the logged-in user. The dashboard, /trips page, /trips/[id] detail, and new-trip form all need to be wired to the real API.

## Goal
Implement all trip CRUD API routes and update every page that currently imports `mockTrips` to fetch from the API instead.

## Requirements

### Backend
- **Trip Mongoose model** (`src/models/Trip.ts`): fields per swagger `Trip` schema — `ownerId` (ref User), `name`, `cities?`, `country`, `coverImage?`, `startDate`, `endDate`, `budget?`, `currency?`, `moods`, `notes?`, `attractionIds[]`, timestamps
- **GET /api/trips** — returns all trips for the authenticated user; supports query params: `upcoming` (startDate > today), `country`, `mood` (filter moods array contains value)
- **POST /api/trips** — creates trip with `ownerId` set from JWT; returns created trip (201)
- **GET /api/trips/[id]** — returns trip if `ownerId` matches authenticated user; 404 if not found or not owned
- **PUT /api/trips/[id]** — updates trip fields; ownership check; returns updated trip
- **DELETE /api/trips/[id]** — deletes trip; ownership check; returns 200

### Frontend wiring
- **Dashboard (`src/app/page.tsx`)**: convert to a Server Component that fetches trips via `GET /api/trips` on the server (or via `useAuth` + client fetch); replace `mockTrips` import; keep the same card grid layout. Greeting uses logged-in user's name.
- **`/trips` page (`TripsClient`)**: fetch trips from `GET /api/trips` on mount; wire the search to query `?country=` and filter client-side by name; show loading skeleton while fetching; handle empty state when API returns `[]`
- **`/trips/[id]` page**: fetch trip from `GET /api/trips/[id]`; show loading state; 404 redirect if API returns 404
- **New-trip form (`NewTripClient`)**: on "Continue" / submit, POST to `/api/trips` with all form fields; on success redirect to `/trips/[id]` where id = created trip's `_id`; show error state if POST fails
- **`src/data/mockTrips.ts`**: keep the file but mark it `@deprecated`; stop importing it in pages (it can still be used for Storybook / tests)

### Auth dependency
All routes require the `Authorization: Bearer <token>` header. Use the `getUserFromRequest` helper from `src/lib/auth.ts` (created in the auth task).

### Swagger reference
- GET /api/trips → Trip[]
- POST /api/trips → TripInput → 201 Trip
- GET /api/trips/{id} → Trip | 404
- PUT /api/trips/{id} → TripInput → Trip
- DELETE /api/trips/{id} → 200

## Constraints
- All route handlers live under `src/app/api/`
- Ownership must be verified on every GET/PUT/DELETE /api/trips/[id] call
- Never expose `ownerId` or other users' trips

## Out of scope
- Trip cover image upload (coverImage remains a URL string)
- Sharing trips with other users
- Attraction wiring (handled in attractions-api-and-wiring task)

## Completion Summary
Trips API and full frontend wiring confirmed by the user on 2026-06-29. Mongoose Trip model, all five CRUD route handlers, and a shared date utility were created. The Trip type was migrated to match the API shape. All pages (dashboard, /trips, /trips/[id], new-trip form) now fetch from /api/trips instead of importing mock data, with shimmer skeleton loading states throughout.

## Implementation Notes
- Files created: `src/models/Trip.ts`, `src/lib/formatDate.ts`, `src/app/api/trips/route.ts`, `src/app/api/trips/[id]/route.ts`, `src/components/TripCard/TripCardSkeleton.tsx`
- Files modified: `src/types/trip.ts` (new API shape), `src/components/TripCard/TripCard.tsx` (name/moods/optional coverImage/date formatting), `src/components/TripCard/TripCard.module.css` (skeleton styles + image placeholder + country text), `src/app/page.tsx` (API fetch + skeletons), `src/app/trips/TripsClient.tsx` (removed trips prop, internal fetch + skeletons), `src/app/trips/page.tsx` (no more prop passing), `src/app/trips/[id]/page.tsx` (passes tripId only), `src/app/trips/[id]/TripDetailClient.tsx` (receives tripId, fetches internally), `src/app/trips/[id]/TripDetailClient.module.css` (loading state + hero placeholder), `src/app/new-trip/NewTripClient.tsx` (POST on submit → redirect to /trips/:id), `src/data/mockTrips.ts` (@deprecated, updated to new shape), `src/components/index.ts` (TripCardSkeleton export)
- Deviations from task requirements: `Trip` type migrated from `{ id, destination, tags }` to `{ _id, name, moods }` to match the API — this is cleaner than maintaining a mapping layer. `TripsClient` had its `trips` prop removed (it now self-fetches) and `trips/[id]/page.tsx` no longer uses `mockTrips.find()` — `TripDetailClient` receives `tripId` and fetches itself. Dashboard shows 3 skeletons while loading; TripsClient shows 4 skeletons.
- New design tokens used: none
