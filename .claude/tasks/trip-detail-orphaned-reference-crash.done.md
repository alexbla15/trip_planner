# Task: Fix trip detail page crash on orphaned owner/collaborator references

Status: done
Track: B
Track reason: Bug fix — broken behavior, not broken appearance

## Problem
Trip detail pages fail to load and show the generic "Couldn't load this trip" error boundary. Reported by the user for `/trips/6a4a1cb0dda7c752c4bcb635`.

Root cause (confirmed by investigation):
- `formatTrip()` in `src/models/Trip.ts` (around lines 127 and 143) calls `.toString()` directly on the populated `ownerId` and `collaborators[].userId` fields. If the referenced user document has been deleted, Mongoose resolves the populated field to `null`, and `.toString()` throws.
- The API route `src/app/api/trips/[id]/route.ts` wraps this in one blanket `try/catch` that returns a generic `{ error: "Server error" }` with status 500, with no server-side logging of the real cause — making this class of bug hard to diagnose.
- The client, `src/app/trips/[id]/TripDetailClient.tsx` (around lines 135-142), only special-cases HTTP 404 and 403 responses from `getTrip`. Any other non-2xx response (like this 500) still falls through to `res.json()` and is blindly cast to `Trip` and stored via `setTrip`. Rendering then crashes on `undefined` fields (e.g. `moods.length`), which is what actually trips the `error.tsx` boundary the user saw.

## Goal
A trip whose owner or a collaborator's user reference is missing/orphaned still loads the trip detail page (or shows a clear, specific error) instead of crashing; and any future server error is diagnosable from logs instead of being swallowed into a generic message.

## Requirements
- Null-guard `formatTrip()` in `src/models/Trip.ts` so a missing populated `ownerId` or `collaborators[].userId` does not throw — decide reasonable output for that field (e.g. omit/null it) rather than crashing.
- In `src/app/api/trips/[id]/route.ts`, log the actual caught error server-side (e.g. `console.error`) before returning the generic error response, so real failures are diagnosable.
- In `TripDetailClient.tsx`, explicitly handle any non-2xx response that isn't 404 or 403 (e.g. treat as a generic failure) instead of assuming the body is a valid `Trip` — route it into the existing error state/boundary rather than crashing on undefined field access.

## Constraints
- Preserve the existing 404 (not found) and 403 (forbidden) handling already in `TripDetailClient.tsx` — don't change that behavior.
- Preserve the existing service-layer convention where `getTrip` (`src/services/trips.service.ts`) returns the raw `Response` for the caller to branch on status — this is intentional (see `docs/LEARNINGS.md`), do not change it to parse/throw.

## Out of scope
- Migrating/cleaning up existing orphaned references in the database (e.g. removing dangling collaborator entries) — this task only prevents the crash, it does not backfill or clean data.
- A broader error-handling audit of other API routes.

## Implementation Notes
- Files created/modified:
  - `src/models/Trip.ts` — `formatTrip()` no longer calls `.toString()` on a null populated `ownerId`; returns `ownerId: undefined` in that case (the field is already optional on the `Trip` type). Collaborator entries whose `userId` populated to `null` (deleted user) are filtered out of the `collaborators` array instead of throwing.
  - `src/app/api/trips/[id]/route.ts` — added `console.error(...)` before the generic error response in the `GET`, `PUT`, and `DELETE` catch blocks (all three had the same swallow-the-error pattern) so real failures are diagnosable from server logs.
  - `src/app/trips/[id]/TripDetailClient.tsx` — added a `loadError` state (mirrors the existing `forbidden` state) and a `tripReloadKey` counter. The trip-fetch effect now treats any non-2xx response that isn't 404/403 as a load error instead of parsing its body as `Trip`. Added a render branch reusing the existing `forbiddenState`/`forbiddenIcon`/`forbiddenHeading`/`forbiddenBody`/`forbiddenBack`/`clearFiltersBtn` CSS classes (no new styles) with an `AlertCircle` icon, a "Try again" button that bumps `tripReloadKey` to refetch, and a "Back to my trips" link.
- Deviations from task requirements: none.
- New design tokens used: none — reused existing CSS module classes (`forbiddenState` family, `clearFiltersBtn`) and an existing icon library (`lucide-react`, `AlertCircle`).

Verified with `tsc --noEmit` (clean), `eslint` on the three changed files (only 4 pre-existing `react-hooks/set-state-in-effect` errors remain, confirmed present before this change via `git stash`), and `next build` (compiles and prerenders successfully, `/trips/[id]` still an on-demand server route). No API request/response shape changed, so `swagger.yaml` was not touched.

## Follow-up fix (same task, surfaced during user verification)
After the above fix, the user reported the trip now loads without crashing but shows "This trip is private" even though they are the owner. Root cause: a second, pre-existing bug in `src/app/api/trips/[id]/route.ts`'s `GET` handler — `trip.ownerId.toString() === userId` and `c.userId.toString() === userId` were comparing against **populated** Mongoose documents (the route calls `.populate("ownerId", ...)` / `.populate("collaborators.userId", ...)` for avatar display). `Document.prototype.toString()` returns a debug `inspect()` dump of the whole document, not the id, so the comparison could never match — the true owner/collaborator always failed the private-trip access check. This predates this task (confirmed via `git log -p` on the route file — it was introduced when collaborator/owner avatar population was added) and was previously masked because the crash fixed above always happened first.

Fix: added an exported `resolveRefId(ref: unknown): string | null` helper in `src/models/Trip.ts` that unwraps either a raw `ObjectId` or a populated document to its plain id string (or `null`). Used it for both `isOwner` and `isCollaborator` in the `GET` handler. Audited every other `.toString() === ` ownership comparison in the codebase (`collaborators/[userId]/route.ts`, `collaborators/route.ts`, `trips/[id]/attractions/route.ts`, `attractions/[id]/route.ts`) — all of them run against unpopulated queries, so this was the only affected spot. Re-verified with `tsc --noEmit`, `eslint`, and `next build` — all clean.

## Completion Summary
Fixed two stacked bugs behind the single user-reported symptom "trip couldn't load" on `/trips/6a4a1cb0dda7c752c4bcb635`: (1) `formatTrip()` crashing on a deleted owner/collaborator reference, causing a 500 the client mishandled as valid trip data, and (2) once that was fixed, a second pre-existing bug where the GET handler's ownership check compared populated Mongoose documents with `.toString() === userId`, which can never match — so the true owner was denied with "This trip is private." Both are fixed, verified with `tsc --noEmit`, `eslint`, and `next build`, and confirmed working by the user. Closed 2026-07-25.
