# Task: Move contributor/privacy controls from trip detail page to edit page

Status: done
Track: B
Track reason: fully-built feature (model fields, auth, user-search, `TripSharingPanel` widget) already exists — this is a relocation of an existing component to a different page, not new UI.

## Problem
`collaborators`/`isPrivate` already exist on the Trip model, trip authorization already checks both owner and collaborators, and `TripSharingPanel` (privacy toggle + searchable add/remove collaborators) is a complete, working component. It's currently rendered on `src/app/trips/[id]/TripDetailClient.tsx` (owner-only, inside the itinerary tab). The user wants this control moved: it should not appear on `trips/[id]`, only on `trips/[id]/edit`.

## Goal
`TripSharingPanel` renders on the edit page (owner-only), not on the trip detail page. The trip detail page keeps its existing read-only "People" chip list (owner + contributor names/avatars) — that's informational display, not an edit control, so it stays.

## Requirements
- `EditTripClient.tsx`: fetch already loads the full trip via `getTrip`; store the full `Trip` object in state (not just individual fields) so it can be passed to `TripSharingPanel`, and render `<TripSharingPanel trip={trip} token={token} onTripUpdate={setTrip} />` for the owner, in its own section on the edit page.
- `TripDetailClient.tsx`: remove the `<TripSharingPanel>` render (and its now-unused wrapping `.sharingSection` div) from the itinerary tab. Leave the read-only "People" list as-is.
- New-trip flow (`NewTripClient.tsx`) is out of scope: a trip has no `_id` until created, so contributors/privacy can't be set before creation exists. Users add collaborators/set privacy via the edit page immediately after creating a trip.

## Constraints
- No model, auth, or API changes — all already correct per prior research.
- Reuse `TripSharingPanel` exactly as-is; no visual changes to the widget itself.

## Out of scope
- Any change to the read-only People display on the trip detail page.

## Addendum — New Trip flow (added mid-task per user request)
User asked to also add `TripSharingPanel` to `new-trip`, overriding the original "out of scope" note. Since a new trip has no `_id` until creation, and `TripSharingPanel` normally makes live API calls (`updateTrip`/`addCollaborator`/`removeCollaborator`) scoped to an existing trip's `_id`, added a `mode?: "live" | "draft"` prop (default `"live"`, unchanged behavior everywhere else):
- **draft mode**: privacy toggle and add/remove-collaborator all update the parent's local state synchronously via `onTripUpdate` — no network calls (collaborator search itself still hits `GET /api/users/search`, which needs no trip context).
- `NewTripClient.tsx` holds local `isPrivate`/`collaborators` state, builds a placeholder `Trip`-shaped object to satisfy `TripSharingPanel`'s existing `trip: Trip` prop type (no type changes needed there), and includes `isPrivate` + `collaboratorEmails` in the `createTrip` payload on submit.
- `POST /api/trips` (`src/app/api/trips/route.ts`) now accepts optional `isPrivate` and `collaboratorEmails: string[]`, resolves emails to existing users via `User.findOne`, silently skips any that don't resolve (already validated as real accounts at selection time via the same search endpoint; only a deleted-account race could invalidate one), and seeds `collaborators` at creation instead of always `[]`.
- `swagger.yaml` updated: `POST /api/trips` request body documents `isPrivate`/`collaboratorEmails`.

**Follow-up (same addendum):** user then asked that adding contributors / toggling privacy never fire a network request on their own — only when the user clicks "Create"/"Save Changes", same as every other field. This meant the edit page's `TripSharingPanel` also needed to switch from `mode="live"` (immediate API calls on every toggle/add/remove) to the same `mode="draft"` used on new-trip:
- `EditTripClient.tsx`: `TripSharingPanel` now rendered with `mode="draft"`; `onTripUpdate={setTrip}` just updates local state. `handleSave`'s `updateTrip` PUT payload now includes `isPrivate: trip?.isPrivate` and `collaboratorEmails: (trip?.collaborators ?? []).map(c => c.email)` — the full desired collaborator list is sent as a batch, resolved server-side.
- `PUT /api/trips/[id]` (`src/app/api/trips/[id]/route.ts`) now accepts `collaboratorEmails?: string[]` — treated as a full replace of the collaborators list (not a diff/add), resolved via `User.find({email: {$in: emails}})`. Owner-only: checked via a lightweight `Trip.exists({_id, ownerId})` query before applying; silently ignored (not an error) if sent by a non-owner collaborator, consistent with how the dedicated `/collaborators` endpoints already gate mutation to the owner.
- The dedicated `/api/trips/{id}/collaborators` POST/DELETE endpoints are unchanged and still used nowhere now (TripSharingPanel no longer calls them in either draft or now-draft-everywhere state) — left in place since they're still documented/independently useful, not dead code to remove as part of this task.

## Implementation Notes
- Files created/modified:
  - `src/app/trips/[id]/TripDetailClient.tsx`, `.module.css` — removed the widget from the detail page.
  - `src/app/trips/[id]/edit/EditTripClient.tsx`, `.module.css` — added `trip` state, rendered `TripSharingPanel` (`mode="draft"`), included `isPrivate`/`collaboratorEmails` in the save payload.
  - `src/app/new-trip/NewTripClient.tsx`, `.module.css` — added local `isPrivate`/`collaborators` state, rendered `TripSharingPanel` (`mode="draft"`) against a placeholder trip object, included both fields in the create payload.
  - `src/components/TripSharingPanel/TripSharingPanel.tsx`, `.types.ts` — added `mode?: "live" | "draft"` prop (default `"live"`); draft mode skips all network calls for privacy/add/remove, updating the parent synchronously instead.
  - `src/app/api/trips/route.ts` (POST) — accepts `isPrivate`/`collaboratorEmails`, resolves emails to users, seeds `collaborators` at creation.
  - `src/app/api/trips/[id]/route.ts` (PUT) — accepts `collaboratorEmails` as a full owner-only replace.
  - `swagger.yaml` — documented `collaboratorEmails` on `TripInput`.
- Deviations from task requirements: none — both the new-trip addition and the deferred-save requirement were explicit follow-up requests from the user, folded into this same task rather than opening new task files, since they're the same feature surface.
- New design tokens used: none.
- Verified: `tsc --noEmit` clean, `eslint` clean (one pre-existing unrelated warning), full `next build` succeeds. No live browser click-through possible in this environment — flagged to user.

## Completion Summary
Moved contributor/privacy management from the trip detail page to the edit page, added the same widget to the new-trip form (in a new "draft mode" that defers all mutation until the surrounding form is submitted), and made the existing edit-page usage defer the same way — no network call fires until "Create Trip" / "Save Changes" is clicked. Confirmed by user 2026-07-26.

## Implementation Notes
- Files created/modified:
  - `src/app/trips/[id]/TripDetailClient.tsx` — removed `<TripSharingPanel>` render + import; kept read-only "People" chip list.
  - `src/app/trips/[id]/TripDetailClient.module.css` — removed now-unused `.sharingSection` rule.
  - `src/app/trips/[id]/edit/EditTripClient.tsx` — added `trip` state (full `Trip` object, set from the existing fetch), imported `TripSharingPanel`, rendered it owner-only in a new bordered section above the submit-error/CTA row.
  - `src/app/trips/[id]/edit/EditTripClient.module.css` — added `.sharingSection` (border-top divider, matching `.dangerZone` spacing convention already in the file).
- Deviations from task requirements: none.
- New design tokens used: none (reused `var(--color-border-subtle)` divider pattern already used elsewhere on this page).
- Verified: `tsc --noEmit` clean; `eslint` on both touched files shows only pre-existing errors/warnings (confirmed via `git stash` diff — identical set present before this change, same `react-hooks/set-state-in-effect`/`exhaustive-deps` pattern as every other file in this codebase).
