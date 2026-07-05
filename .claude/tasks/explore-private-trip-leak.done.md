# Task: Fix Private Trip Leak in Explore

Status: done

Track: B
Track reason: Bug fix — access control logic + appropriate error state in the UI

## Problem
Two bugs:
1. Private trips appear in the Explore section even for their own owner — Explore is a public discovery page and private trips must never appear there, for anyone.
2. When a user navigates directly to `/trips/[id]` for a private trip they have no access to, they are silently redirected to `/trips` — there is no meaningful feedback about why.

## Goal
Private trips never appear in Explore (for any user). Accessing a private trip's URL without permission shows an appropriate, informative error page.

## Requirements

### Explore API (`src/app/api/explore/route.ts`)
- Always filter `isPrivate: { $ne: true }` — no owner/collaborator exception. Private trips are never discovery content.
- Auth on this endpoint can remain optional; the filter is unconditional regardless of who is logged in.

### Trip detail API (`src/app/api/trips/[id]/route.ts` — GET handler)
- Distinguish "trip doesn't exist" (404) from "trip exists but is private and you don't have access" (403).
- Implementation: first check if the trip exists; if it does but the user lacks access → return 403 with `{ error: "This trip is private" }`.

### Trip detail client (`src/app/trips/[id]/TripDetailClient.tsx`)
- Handle the 403 response: instead of redirecting, render an inline error state that says something like "This trip is private" with a short explanation and a link back.
- Continue handling 404 with the existing redirect to `/trips`.
- The error state must use CSS Modules (no inline styles). Keep it simple — a centred message with an icon and a back link is enough.

## Constraints
- CSS Modules only — no inline styles, no Tailwind
- Use existing design tokens from `docs/DESIGN_SYSTEM.md`
- Do not change the Explore UI or the trip detail layout — only the access-control logic and the error state

## Out of scope
- Redesigning the Explore page
- Changing the privacy toggle UI

## Implementation Notes
- Files created/modified:
  - `src/app/api/explore/route.ts` — reverted to unconditional `isPrivate: { $ne: true }` filter; removed all auth logic (private trips never appear in Explore for anyone)
  - `src/app/api/trips/[id]/route.ts` — GET handler now fetches by ID first, then checks access; returns 403 for private trips the caller can't access, 404 only when the trip doesn't exist
  - `src/app/trips/[id]/TripDetailClient.tsx` — added `forbidden` state; 403 response renders inline error page instead of redirecting; added `Lock` icon import
  - `src/app/trips/[id]/TripDetailClient.module.css` — added `.forbiddenState`, `.forbiddenIcon`, `.forbiddenHeading`, `.forbiddenBody`, `.forbiddenBack` classes
  - `swagger.yaml` — corrected Explore description; updated GET `/api/trips/{id}` to document 403 response and revise 404 semantics
- Deviations from task requirements: none
- New design tokens used: none (used existing `--color-text-tertiary`, `--color-text-primary`, `--color-text-secondary`, `--color-primary`, `--color-primary-dark`, `--text-2xl`, `--text-base`, `--text-sm`)

## Completion Summary
Fixed two private-trip access control bugs. The Explore API now always excludes private trips unconditionally — no owner/collaborator exceptions, as Explore is pure public discovery. The trip detail API now returns 403 (not 404) when a trip exists but is private and the caller lacks access; the client renders an inline "This trip is private" error page with a lock icon and back link instead of silently redirecting. Confirmed by the user on 2026-07-05.
