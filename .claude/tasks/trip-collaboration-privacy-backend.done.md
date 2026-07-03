# Task: Trip Collaboration & Privacy — Backend

Status: done

Track: B
Track reason: Pure backend/API — schema changes, new endpoints, auth guard updates; no new visual surface.

## Problem
Trip creators have no way to share editing access with other users, and all trips are effectively public to anyone with a link or token. Collaborators need write access to a trip they don't own, and owners need to be able to make a trip private.

## Goal
Add `collaborators` and `isPrivate` to the Trip model, expose endpoints to manage collaborators, and enforce access control across all trip-related routes.

## Requirements

### Data model changes (`src/models/Trip.ts`)
- Add `collaborators: [{ userId: ObjectId (ref: User), email: String, name: String }]` — default `[]`
- Add `isPrivate: Boolean` — default `false`
- Update `formatTrip` to include both new fields in its return shape

### New endpoints
- `POST /api/trips/[id]/collaborators` — owner-only; body `{ email: string }`. Look up the user by email, reject if not found or if already a collaborator or if they are the owner. Push `{ userId, email, name }` to `collaborators` and save.
- `DELETE /api/trips/[id]/collaborators/[userId]` — owner-only; remove the collaborator with that userId from the array.

### Updated access control (apply to every existing trip route)
A user is **authorised** to read or write a trip if they are:
- the owner (`trip.ownerId === payload.userId`), OR
- listed in `trip.collaborators` (`trip.collaborators.some(c => c.userId.toString() === payload.userId)`)

Routes to audit and update:
- `GET /api/trips` — return trips where user is owner **or** collaborator (update the Mongoose query)
- `GET /api/trips/[id]` (if it exists) — check owner or collaborator
- `PUT /api/trips/[id]` (if it exists) — check owner or collaborator
- `DELETE /api/trips/[id]` (if it exists) — owner-only (collaborators cannot delete)
- `GET /api/trips/[id]/attractions` — check owner or collaborator
- `POST /api/trips/[id]/attractions` — check owner or collaborator
- `PATCH /api/trips/[id]/attractions/[attractionId]` — check owner or collaborator
- `DELETE /api/trips/[id]/attractions/[attractionId]` — check owner or collaborator

### Privacy enforcement
- `GET /api/trips` — already scoped to the requesting user (owner + collaborator), so private trips are naturally included for them and excluded for everyone else. No extra filter needed here.
- If a public trip-detail route is ever added (unauthenticated access), it must check `isPrivate` before returning. Flag this in a code comment for now.

### TypeScript types (`src/types/trip.ts` or equivalent)
- Add `collaborators: { userId: string; email: string; name: string }[]` and `isPrivate: boolean` to the `Trip` type.

## Constraints
- Use the existing `getUserFromRequest` helper for auth — do not introduce a new pattern.
- Collaborator lookup must be by **email** (not userId) — the UI will let owners type an email address.
- Do not remove the `requireOwner` helper; make it a parameter or add a separate `requireOwnerOrCollaborator` helper as fits the existing code structure.

## Out of scope
- Frontend UI (Task 2)
- Email notifications to invited collaborators
- Role levels beyond owner / editor (no read-only collaborators)
- Accepting/declining invitations — collaboration is immediate on owner action

## Completion Summary
Backend for trip collaboration and privacy delivered and confirmed by the user on 2026-07-03. Added `collaborators` array and `isPrivate` flag to the Trip model, updated all five existing trip/attraction route files to enforce owner-or-collaborator access control, and created two new endpoints (`POST` and `DELETE` on `/api/trips/:id/collaborators`) for managing shared editors. Swagger kept in sync throughout.

## Implementation Notes
- Files created/modified:
  - `src/types/trip.ts` — added `TripCollaborator` interface; added `collaborators` and `isPrivate` to `Trip`
  - `src/models/Trip.ts` — added `ICollaborator` interface, `CollaboratorSchema`, `collaborators` and `isPrivate` fields to `TripSchema`; updated `formatTrip`; added index on `collaborators.userId`
  - `src/app/api/trips/route.ts` — GET now queries `$or: [ownerId, collaborators.userId]`; POST initialises both new fields
  - `src/app/api/trips/[id]/route.ts` — `resolveTrip` gained `ownerOnly` param; GET/PUT use owner-or-collaborator query; DELETE stays owner-only; PUT handles `isPrivate`
  - `src/app/api/trips/[id]/attractions/route.ts` — `getAuthedTrip` and GET use owner-or-collaborator `$or` query
  - `src/app/api/trips/[id]/attractions/[attractionId]/route.ts` — both PATCH and DELETE use owner-or-collaborator query
  - `src/app/api/trips/[id]/reorder-attractions/route.ts` — uses owner-or-collaborator query
  - `src/app/api/trips/[id]/collaborators/route.ts` — new; POST adds collaborator by email (owner-only)
  - `src/app/api/trips/[id]/collaborators/[userId]/route.ts` — new; DELETE removes collaborator (owner-only)
  - `swagger.yaml` — added `TripCollaborator` schema, new fields on `Trip` and `TripInput`, two new collaborator paths
- Deviations from task requirements: none
- New design tokens used: none (backend only)
