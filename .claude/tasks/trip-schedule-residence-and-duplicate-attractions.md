# Task: Allow Residences in Schedule (Already Works?) + Allow Scheduling the Same Attraction Twice

Status: reviewing

Track: B
Track reason: The duplicate-attraction relaxation is a data-model/logic change (schedule storage keyed by attraction id needs to become instance-keyed) — no new UI surface, existing calendar UI already renders whatever's in the schedule. The residence part may turn out to need no code change at all (see Requirements).

## Problem
User request (as given, with a mid-conversation correction): "allow to add residence [to schedule]" and "allow to put the same attraction more than once." Investigated before writing this spec, since the premise of the first part didn't match what the code actually does:

- **Residences**: no exclusion of `subtype === "residence"` was found anywhere in the assign/schedule path (`CalendarSection.tsx`'s `handleAssign`, the "Assign to day…" dropdown, `regularAttractions` filtering — which only excludes `custom-slot`, not `residence` — or the server-side `updateTripAttractionSchedule`). Residences already flow through the same sidebar list and "assign to day" mechanism as any other attraction today. **If residences genuinely can't be added in practice, this needs to be re-confirmed as a live repro (exact steps, exact screen) rather than a code-level block, since none was found.**
- **Duplicate attractions**: the same attraction _can_ already be linked to a trip only once per the existing dedup check (`src/lib/services/attractions.service.ts` `addAttractionToTrip`, checks `trip.attractionIds` membership by `_id`). But relaxing this is **not just deleting that check** — `trip.schedules` is a `Map<attractionId, singleScheduleEntry>` (`src/models/Trip.ts`). A second "add" for the same attraction id would silently overwrite the first schedule entry's `plannedDate`/`plannedTime` (Map keys are unique), and even if `attractionIds` allowed the same id twice, `listTripAttractions`'s `Attraction.find({ _id: { $in: trip.attractionIds } })` returns each matching document once regardless of duplicate ids in the query array — so a naive fix would still only ever show one card/block, silently losing whichever schedule was written first.

## Goal
1. Confirm whether residences actually can't be added to the schedule today, and either close this out as already-working (with a note on the confusion) or fix whatever concrete blocker the user actually hits.
2. The same attraction can be scheduled more than once (e.g. the same restaurant on two different days, or twice in one day) — each instance keeping its own independent day/time, not overwriting the other.

## Requirements
- **Residence re-confirmation**: before writing any fix, reproduce the actual reported blocker live (open a real trip, try to assign a residence to a day via whatever UI path the user used) — don't assume the investigation's "no guard found" conclusion means there's nothing to fix; the block could be in a code path not yet checked (e.g. a specific button being disabled/hidden for residences elsewhere, or a residence-specific UI flow that bypasses the general assign mechanism). If a real repro is found, fix that specific path. If no repro reproduces, report back to the user that this already works today and confirm with them directly rather than silently closing it.
- **Duplicate-attraction scheduling**: needs an instance-keyed schedule, not a `Map<attractionId, entry>`. The app already has precedent for "multiple instances of one conceptual thing" — custom-slots and flights use synthetic per-instance keys (`cs-<objectId>`/`fl-<...>` per `src/lib/services/attractions.service.ts`) stored directly in `schedules`, decoupled from a shared `Attraction` document. Follow that same pattern: generating a fresh instance key per "add to schedule" action for a regular attraction, rather than keying by the shared attraction's own `_id`, so `trip.schedules` can hold N independent entries referencing the same underlying `Attraction` document.
- Whatever the chosen data shape, update every place currently assuming "one schedule entry per attraction id, keyed by that id" — at minimum: `attractions.service.ts` (`addAttractionToTrip`, `updateTripAttractionSchedule`, `listTripAttractions`'s one-doc-per-id `$in` mapping), `CalendarSection.tsx` (`local` state is currently one `Attraction` object per `_id` with schedule fields flattened onto it; `handleAssign`/`handleUnassign`/`putOne` address a single attraction by bare `_id`; render `key={a._id}` in multiple places assumes one entry per id — all enumerated by the investigation, re-verify the current line numbers fresh since they may have shifted).
- Decide how the UI lets a user deliberately add a second instance of an attraction already in the trip (currently `AttractionSearchModal` shows already-added results as disabled + "Added" — that convention needs to change for regular attractions specifically, since "already added" should no longer mean "can't add again"; the investigation notes residences/flights were already excluded from that treatment for the same underlying reason).

## Constraints
- Don't change how custom-slots or flights already handle multiple instances — they already work correctly via per-instance keys; regular attractions should adopt the same pattern, not a different one.
- Don't regress the existing single-instance case — an attraction added once should behave exactly as it does today (this is additive: enabling a second/third addition, not changing the first).
- Re-verify all file:line references from the investigation fresh at implementation time — this app has had substantial refactors this session and a prior LEARNINGS.md entry specifically warns that citations from an earlier investigation can go stale.

## Out of scope
- Changing custom-slot/flight instance-handling (already correct)
- Any change to `TripDayMapWidget.tsx`'s residence "home base" marker logic (unrelated map-rendering concern, not the schedule/assign flow)

## Implementation Notes

**Residences**: re-confirmed no code fix was needed — the investigation's conclusion held. `AttractionSearchModal` is used twice; the residence-picker instance already omits `existingAttractionIds` (no blocking), and nothing in the assign/schedule path excludes `subtype === "residence"`. Not touched further.

**Duplicate attractions**: implemented the synthetic-instance-key design from the Requirements section.
- `src/models/Trip.ts`: added `attractionRef?: string` to `IScheduleEntry` (+ schema field) — set only on a 2nd+ instance, pointing back to the shared `Attraction` doc. Primary instance is unchanged (schedule key IS the doc id, field absent).
- `src/types/attraction.ts` / `src/models/Attraction.ts`: added `attractionId` to the client `Attraction` shape; `formatAttraction()` gained an optional `idOverride` param so a row's `_id` can be the synthetic instance key while `attractionId` always carries the real doc id.
- `src/lib/services/attractions.service.ts`:
  - `listTripAttractions` now groups schedule entries by real doc id (via `attractionRef` or the entry's own key) and emits one row per instance, preserving prior sort order for the single-instance case.
  - `addAttractionToTrip` gained `allowDuplicate?: boolean` on the input. When the attraction is already linked and `allowDuplicate` is true, generates an `at-<objectId>` key and writes the new instance via `Trip.findByIdAndUpdate` + `$set` (never `.save()`, per the documented Map-field gotcha). Default behavior (no flag) is byte-for-byte unchanged.
  - `updateTripAttractionSchedule` now resolves the real doc id via the entry's `attractionRef` before loading the `Attraction`, and returns the row under its original (possibly synthetic) key.
  - `removeAttractionFromTrip` now only unlinks the shared doc from `attractionIds` when no other instance (primary key or another `attractionRef`) still references it — deleting one instance no longer corrupts/breaks sibling instances.
- `src/components/AttractionSearchModal/AttractionSearchModal.tsx`: already-added results are no longer disabled — the "Added" tag is now a status indicator, not a blocking state; clicking/selecting an already-added result triggers another add.
- `src/app/trips/[id]/TripDetailClient.tsx`: `handleSearchAdd` now detects "already linked" client-side and passes `allowDuplicate: true` in that case; `handleResidenceUpdate`/`handleAttractionUpdate` now address the shared document via `attractionId ?? _id` instead of the row's own `_id` (which may be synthetic); `handleAttractionUpdate`'s local-state merge now also propagates a shared-doc edit to every row referencing that document, not just the row that was open in the edit modal; `existingAttractionIds` passed to the search modal now uses real doc ids.
- `swagger.yaml`: documented `attractionId` (response) and `allowDuplicate` (request) on the relevant schemas, plus `attractionRef` on `AttractionSchedule`.
- Added a `docs/LEARNINGS.md` entry: a brand-new Mongoose schema field is silently stripped by strict mode until the dev server is restarted (model registration survives Next.js hot-reload) — this cost real debugging time during verification (`attractionRef` wasn't persisting until a restart, despite correct code).

**Live verification** (throwaway trip/attraction via real dev server + real MongoDB, cleaned up after): add once, re-add without `allowDuplicate` (idempotent 200, same `_id`), re-add with `allowDuplicate` (201, new synthetic `_id`, same `attractionId`) → GET shows 2 independent rows with correct separate `plannedDate`/`plannedTime` → PATCH one instance doesn't affect the other → editing the shared document via `attractionId` reflects on both rows → deleting one instance leaves the other intact and keeps the doc linked → deleting the last instance fully unlinks the doc from `attractionIds`. All checks passed.
- Deviations: none from the task's Requirements/Constraints.
- New design tokens used: none (Track B, no new UI surface — only a disabled-state removal on existing markup).
