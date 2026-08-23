# Task: Nested attractions — data model & backend

Status: intake
Track: B
Track reason: schema + API/service logic, no UI surface of its own (the UI tasks that consume this ride on later tasks in the same goal).

## Problem
There's currently no way to represent "this attraction is located inside that attraction" (e.g. a restaurant inside a mall, an exhibit inside a zoo). Every attraction is a fully independent top-level entity with its own coordinates, which means a mall and every restaurant inside it each get their own map pin at effectively the same spot, and there's no way to browse "what's inside this place."

## Goal
An `Attraction` document can optionally reference a parent `Attraction` (one level of nesting only — a child cannot itself be a parent). A child's coordinates/city/country are inherited from the parent, not independently set. Every existing consumer of the attraction shape (list/search/detail/create/update endpoints) gets enough information to know: is this a child (and of whom), and — for a parent — how many/which children does it have.

## Requirements
- **Schema** (`src/models/Attraction.ts`): add an optional `parentAttractionId` (ObjectId ref to `Attraction`) field.
- **Creation** (`createAttraction` / `POST /api/attractions`): accept an optional `parentAttractionId` in the request body.
  - When present: validate the referenced attraction exists, belongs to the same country (matching existing cross-entity validation conventions in this codebase), and is NOT itself already a child (enforce the one-level-only rule — reject with a clear error if the chosen "parent" already has its own `parentAttractionId` set).
  - When present: the new document's `coordinates`/`city`/`country` are copied from the parent at creation time (not client-supplied) — inherited, not independently editable. Confirm with a quick check of how `NewAttractionModal`'s current payload shape works before deciding whether the API should silently overwrite client-sent coordinates/city/country when a parent is set, or reject the request if they're sent at all — pick whichever avoids a confusing silent-overwrite UX, document the choice.
- **Update** (`updateAttraction` / `PUT /api/attractions/{id}`): allow setting/clearing `parentAttractionId` after creation (e.g. "actually, this restaurant is inside the mall"). Same validation as creation (one-level-only, same-country). If a parent is newly set, re-derive coordinates/city/country from it the same way creation does. Consider (and note the decision either way): should un-setting a parent leave the last-inherited coordinates in place, or require the user to now provide their own? Simplest/likely-expected: leave them in place — the place doesn't physically move just because its "part of X" link is removed.
- **Response shape** (`formatAttraction` in `src/models/Attraction.ts`, and the shared `Attraction` type in `src/types/attraction.ts`): every attraction response includes:
  - `parentAttractionId?: string` and `parentAttractionName?: string` (for a child, so consumers can render "Part of {name}" without a second lookup).
  - `childAttractionCount?: number` (for a parent, so consumers can render "Contains N places" without fetching all children). Compute efficiently — don't N+1 query per attraction in a list; batch it the same way `getUsedInTripsMap`/`getVisitedIdSet` batch their per-user computed fields (see `src/lib/services/visited.service.ts`, `src/lib/services/usedInTrips.service.ts` for the established pattern of "resolve a Map once, pass it into `formatAttraction` at every call site").
- **Prevent deleting a parent that still has children** OR **cascade-clear the link** — pick one and document it in Implementation Notes (recommend: block deletion with a clear error, matching how destructive actions are generally guarded elsewhere in this app, rather than silently orphaning children's `parentAttractionId`).
- Update `swagger.yaml` for every changed request/response shape (new field, new validation error cases).

## Constraints
- Reuse the exact per-user computed-field batching pattern already established for `isVisited`/`usedInTripNames` (Map built once, threaded through every `formatAttraction` call site) — don't invent a new convention. Note: unlike those two, parent name / child count are NOT per-user — they're intrinsic to the attraction — so the batching function shouldn't take a `userId` param at all.
- One level of nesting only, per the confirmed decision — enforce it server-side (don't trust the client to only ever pick a non-child as parent).
- Don't touch the create/edit UI, detail-display UI, or map rendering in this task — those are separate tasks in the same goal. This task's job is: the field exists, is validated, and is present on every response.

## Out of scope
- `NewAttractionModal`'s parent-picker UI (next task in this goal).
- `AttractionDetailModal`/grid-card "Part of X" / "Contains N" display (next task in this goal).
- Excluding children from map pins (last task in this goal).
- Multi-level nesting (explicitly rejected per the confirmed decision).
