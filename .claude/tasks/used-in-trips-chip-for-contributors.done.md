# Task: "Used in my trips" chip should count trips where the user is a contributor, not just owner

Status: done
Track: B
Track reason: Backend query-logic change (widen an existing `Trip.find` filter) — no new UI, reuses the existing badge that already renders from this data.

## Problem
`src/lib/services/usedInTrips.service.ts` computes the "used in my trips" chip by querying `Trip.find({ ownerId: userId, attractionIds: attractionId })` — only trips the user **owns**. A user who is a contributor/collaborator on someone else's trip that includes this attraction doesn't see the chip, even though the attraction genuinely is "in one of their trips."

## Goal
The "used in my trips" badge (rendered in `AttractionGridCard.tsx` via `usedInTripNames`) appears for trips the user owns OR collaborates on, not just owns.

## Requirements
- In `src/lib/services/usedInTrips.service.ts` (`getUsedInTripsMap`/`getUsedInTripIdSet`/`getUsedInTripNames`), widen the query from `{ ownerId: userId, attractionIds: attractionId }` to also match trips where the user is a collaborator — per project's established pattern, use `$or: [{ ownerId: userId }, { 'collaborators.userId': userId }]` combined with `attractionIds: attractionId`.
- No change to the badge's rendering/copy — only the underlying trip set it's computed from.

## Constraints
- Reuse the exact `$or` collaborator-access pattern already established elsewhere in the codebase (per project learnings: `{ $or: [{ ownerId: userId }, { 'collaborators.userId': userId }] }` — Mongoose auto-casts the string userId against the ObjectId-typed field) rather than inventing a new access check.
- Verify this doesn't change behavior for private trips inappropriately — a collaborator already has legitimate access to a trip's contents, so surfacing "used in trips" for it is consistent with existing access rules; don't add extra filtering here.

## Out of scope
- Any change to who can edit/remove an attraction from a trip (permissions elsewhere are unaffected).

## Implementation Notes
- Files created/modified:
  - `src/lib/services/usedInTrips.service.ts` — `getUsedInTripsMap` and `getUsedInTripNames` both widened from `{ ownerId: userId, ... }` to `{ $or: [{ ownerId: userId }, { "collaborators.userId": userId }], ... }`, matching the exact pattern already used elsewhere for owner-or-collaborator trip access. `getUsedInTripIdSet` needed no change (derives from `getUsedInTripsMap`).
- Deviations from task requirements: none.
- New design tokens used: none — no UI changes, per the task's own scope.

Verified with `npx tsc --noEmit` (clean) and `npx eslint` on the changed file (clean).

## Completion Summary
The "used in my trips" badge now also lights up for trips where the user is a collaborator, not just an owner — a small backend query widening reusing the existing owner-or-collaborator access pattern. No UI changes. Confirmed by user on 2026-08-26.
