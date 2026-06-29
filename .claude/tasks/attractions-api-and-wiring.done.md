# Task: Attractions API & Frontend Wiring

Status: done

Track: B
Track reason: API Route Handlers + wiring existing trip-detail UI to real data; no new visual surfaces

## Problem
The trip-detail page shows a static "No attractions added yet" empty state. Attractions need to be stored in MongoDB, associated with a trip, and fully manageable (add, remove, reorder) from the trip-detail page.

## Goal
Implement all attraction CRUD and reorder API routes, and wire the trip-detail page to load, display, add, and remove real attractions.

## Requirements

### Backend
- **Attraction Mongoose model** (`src/models/Attraction.ts`): fields per swagger `Attraction` schema — `tripId` (ref Trip), `ownerId` (ref User), `name`, `country`, `city`, `coordinates?` ({ lat, lng }), `types[]`, `durationValue?`, `durationUnit?` (minutes|hours), `price?`, `openingHours?` (Mon–Sun objects with closed/open/close), timestamps
- **GET /api/trips/[tripId]/attractions** — returns attractions for the trip; verify trip ownership; supports `?type=` and `?sort=price` query params
- **POST /api/trips/[tripId]/attractions** — creates attraction with `tripId` + `ownerId`; pushes `_id` to `Trip.attractionIds`; returns 201 Attraction
- **PUT /api/attractions/[id]** — updates attraction fields; ownership check; returns updated Attraction
- **DELETE /api/attractions/[id]** — deletes attraction globally; removes its id from parent trip's `attractionIds`; ownership check
- **DELETE /api/trips/[tripId]/attractions/[attractionId]** — removes attraction from trip's `attractionIds` array (does not delete the Attraction document)
- **PUT /api/trips/[tripId]/reorder-attractions** — accepts `{ attractionIds: string[] }`, updates `Trip.attractionIds` to the given order; ownership check

### Frontend wiring
- **Trip detail page (`TripDetailClient`)**: on mount fetch `GET /api/trips/[id]/attractions`; render attraction list with name, types, city, duration, price; show loading state; empty state if no attractions
- **Add Attraction button** on trip-detail page opens the existing `NewAttractionModal`; on save POST to `/api/trips/[tripId]/attractions`; update local list on success
- **Remove attraction** — call `DELETE /api/attractions/[id]`; optimistically remove from local list
- **Attractions count** — show live count badge on trip-detail header

### Swagger reference
- GET /api/trips/{tripId}/attractions → Attraction[]
- POST /api/trips/{tripId}/attractions → AttractionInput → 201 Attraction
- PUT /api/attractions/{id} → AttractionInput → Attraction
- DELETE /api/attractions/{id} → 200
- DELETE /api/trips/{tripId}/attractions/{attractionId} → 200
- PUT /api/trips/{tripId}/reorder-attractions → ReorderInput → 200

## Constraints
- Ownership check on every route (verify tripId belongs to the JWT user)
- Deleting an attraction globally must also clean up `Trip.attractionIds`
- `AttractionFormData` from `NewAttractionModal` must be mapped to `AttractionInput` before POSTing

## Out of scope
- Drag-and-drop reorder UI (reorder API only)
- Editing an existing attraction from the UI (PUT endpoint exists but no edit UI)
- Global attraction library / search

## Completion Summary
Attractions API and trip-detail wiring confirmed by the user on 2026-06-29. Full CRUD route handlers created for attractions (list, create, update, global delete, trip-scoped remove, reorder). The trip detail page now fetches and renders a live attraction list with add (via NewAttractionModal) and remove (optimistic) functionality. Attraction count in the overview card is live.

## Implementation Notes
- Files created: `src/types/attraction.ts`, `src/models/Attraction.ts`, `src/app/api/trips/[id]/attractions/route.ts`, `src/app/api/trips/[id]/attractions/[attractionId]/route.ts`, `src/app/api/trips/[id]/reorder-attractions/route.ts`, `src/app/api/attractions/[id]/route.ts`
- Files modified: `src/app/trips/[id]/TripDetailClient.tsx` (attractions fetch, modal wiring, list render, optimistic remove), `src/app/trips/[id]/TripDetailClient.module.css` (addBtn button fix, attractionList/attractionItem/removeBtn styles)
- Deviations from task requirements: None. Nested routes use `[id]` (matching existing trips folder) instead of `[tripId]` — required by Next.js App Router (can't have two different dynamic segment names at the same level). The `Attraction` type import was aliased to `AttractionShape` inside `models/Attraction.ts` to avoid a naming collision with the exported Mongoose model.
- New design tokens used: none
