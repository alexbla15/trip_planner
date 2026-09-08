# Task: Remove the admin inbox (Admin Messages) feature entirely

Status: done
Track: B
Track reason: deletion of an existing feature — no new UI, no design decisions

## Problem
User explicitly asked to remove the admin inbox (attraction-edit notification bell) and
all its data — "i don't like it".

## Goal
The feature is fully removed from the codebase (UI, API, service, model) and its DB
collection is deleted, with no dangling references or dead imports left behind.

## Requirements
- Delete: `src/components/AdminMessagesBell/`, `src/app/api/admin/messages/`,
  `src/models/AdminMessage.ts`, `src/lib/services/adminMessages.service.ts`,
  `src/services/adminMessages.service.ts`
- Unwire: the notification-creation call + snapshot in
  `src/lib/services/attractions.service.ts`'s `updateAttraction`, the `attraction:updated`
  window event dispatch in `src/services/attractions.service.ts` (only ever consumed by
  the bell), barrel exports in `src/components/index.ts`/`src/services/index.ts`, and the
  `<AdminMessagesBell />` render in `src/components/Navbar/Navbar.tsx`
- Remove the `/api/admin/messages` and `/api/admin/messages/{id}` paths + the
  `AdminMessage` schema from `swagger.yaml`
- Drop the `adminmessages` MongoDB collection (per "and all data within it")

## Constraints
- Don't touch unrelated admin-only functionality (the Manager Panel, verified toggling,
  etc.) — only this specific notification-inbox feature

## Out of scope
- Any replacement notification mechanism — this is a removal, not a redesign

## Implementation Notes
- Files/directories deleted: src/components/AdminMessagesBell/, src/app/api/admin/messages/, src/models/AdminMessage.ts, src/lib/services/adminMessages.service.ts, src/services/adminMessages.service.ts
- Files modified: src/lib/services/attractions.service.ts (removed snapshotAttraction/createAttractionEditMessage import + call + beforeSnapshot capture), src/services/attractions.service.ts (removed the attraction:updated window event dispatch, only ever consumed by the bell), src/components/index.ts + src/services/index.ts (barrel exports removed), src/components/Navbar/Navbar.tsx (removed the bell import + render), swagger.yaml (removed the Admin Messages path block and the AdminMessage schema component)
- DB: dropped the `adminmessages` collection — 540 documents removed
- Deviations from task requirements: none
- New design tokens used: none (removal only)
- Verification: tsc clean; eslint clean on all touched files; confirmed via grep that no source file references AdminMessage/adminMessages/AdminMessagesBell anymore; live-verified GET /api/admin/messages now 404s, Explore still loads with no console errors, and the navbar renders cleanly with no gap where the bell used to be

## Completion Summary
Fully removed the admin inbox / attraction-edit notification feature (UI, API, service, model) and dropped its MongoDB collection (540 documents). Confirmed by the user 2026-09-08.
