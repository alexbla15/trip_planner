# Task: Attraction Form Missing Fields on Create

Status: done

Track: B
Track reason: bug fix — no new visual surface; data loss in existing POST route

## Problem
When creating a new trip attraction via the "Add Attraction" form, the `notes` and `photoUrl` fields entered by the user are not saved. They arrive in the client's POST body but the server-side route silently drops them.

## Goal
All fields the user fills in through the new attraction form (including notes and photo URL) are persisted to the database on creation.

## Root Cause
`src/app/api/trips/[id]/attractions/route.ts` — the POST handler's body type definition and destructuring both omit `notes` and `photoUrl`. They are also absent from the `Attraction.create({...})` call. The client (`handleAttractionSave` in `TripDetailClient.tsx`) correctly sends them, but the route ignores them.

## Requirements
- Add `notes?: string` and `photoUrl?: string` to the body type in the POST handler (`src/app/api/trips/[id]/attractions/route.ts`)
- Destructure both fields
- Pass them to `Attraction.create({...})`
- No changes needed to the client, model, or types — they already support these fields

## Constraints
- Only touch `src/app/api/trips/[id]/attractions/route.ts`
- Do not add notes/photoUrl to the `verifyTripOwnership` helper — keep the fix minimal

## Out of scope
- Validation of photoUrl format
- Any UI changes

## Implementation Notes
- Files modified: `src/app/api/trips/[id]/attractions/route.ts`
- Deviations from task requirements: none
- New design tokens used: none


## Completion Summary
Bug fixed: POST /api/trips/[id]/attractions/route.ts was silently dropping notes and photoUrl. Added both fields to the body type, destructuring, and Attraction.create(). Confirmed by user 2026-06-29.
