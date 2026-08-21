# Task: Allow duplicate attraction names on update when coordinates differ

Status: done
Track: B
Track reason: backend/logic-only change to duplicate-name validation in `updateAttraction` (src/lib/services/attractions.service.ts) plus its error message — no new UI surface or visual change.

## Problem
`updateAttraction` currently blocks any name update if another attraction already has that name (case-insensitive, collation strength 2), regardless of location. This wrongly blocks legitimate edits — e.g. renaming an attraction to "Central Park" when a different "Central Park" already exists in another city/country, since real-world places can share a name at different coordinates.

## Goal
Updating an attraction's name only fails as a conflict when another attraction has both the same name AND the same coordinates (i.e. it's actually the same place). If a same-named attraction exists at different coordinates, the update proceeds, and any error message shown in that scenario (if the API still needs to report something, e.g. for logging/audit) reflects that the conflict was location-based, not a blanket "name already exists" block.

## Requirements
- In `updateAttraction` (`src/lib/services/attractions.service.ts:219-228`), when `body.name` differs from the current name, only throw the `conflict("An attraction with this name already exists")` when the duplicate found also has matching coordinates to the attraction being updated (post-update coordinates, i.e. `body.coordinates` if being updated in the same call, else the attraction's existing coordinates).
- If a same-named attraction exists but coordinates differ, do not throw — allow the update to proceed.
- Update the conflict error message so it's accurate given the new rule — it should communicate that the name+location combination conflicts (e.g. "An attraction with this name already exists at this location"), since a same-name-only match is no longer sufficient to trigger it.
- Leave `createAttraction`'s duplicate-name check (attractions.service.ts:139-146) untouched — this task is scoped to update only.

## Constraints
- The duplicate-key DB check (`throwIfDuplicateKeyError`, name-based E11000) is a race-condition safety net around a unique index on `name` alone — check whether the schema/index needs adjusting to a compound (name, coordinates) unique index, or whether that safety net should be relaxed/removed to match the new business rule. Investigate `src/models/Attraction.ts` before deciding.
- Coordinate comparison should treat missing/null coordinates sensibly (e.g. an attraction with no coordinates set shouldn't be treated as "matching" another with no coordinates, unless that's actually desired — use judgment, default to requiring both non-null and equal).

## Out of scope
- Changing `createAttraction`'s duplicate-name behavior.
- Any new UI copy beyond surfacing the corrected error message through the existing error-toast/inline-error path already used for the 409 today.

## Implementation Notes
- Files created/modified:
  - `src/models/Attraction.ts` — replaced the `{ name: 1 }` unique index with a compound `{ name: 1, "coordinates.lat": 1, "coordinates.lng": 1 }` unique index, `partialFilterExpression` scoped to docs with numeric coordinates (attractions without coordinates never collide with each other on name alone).
  - `src/lib/services/attractions.service.ts` — `updateAttraction`'s duplicate check now only queries for/conflicts on a match with the *same* coordinates (post-update coordinates: `body.coordinates` if being changed in the same call, else the existing value); skips the check entirely when the effective coordinates are null/incomplete, since a match can't be confirmed without them. `throwIfDuplicateKeyError`'s message updated to "An attraction with this name already exists at this location" (now accurate — the DB index only fires on a true name+coordinates collision). `updateAttraction`'s `attraction.save()` wrapped in try/catch through the same helper, closing the pre-check/save race window that already existed for create.
  - `scripts/migrate-attraction-name-coords-index.mjs` (new, one-off) — drops the stale `name_1` unique index and creates the new compound index; already run against the dev DB.
  - `swagger.yaml` — added a `409` response to `PUT /api/attractions/{id}` (previously undocumented) describing the new name+coordinates conflict rule.
- Deviations from task requirements: none. `createAttraction`'s own duplicate-name pre-check (line ~139) is untouched and still blocks on name alone, as specified — only its DB-level race safety net now shares the updated message, which remains accurate since the compound index can only fire when coordinates also match.
- New design tokens used: none (no UI change).
- Verified: `tsc --noEmit` and `eslint` clean on both changed source files; migration script run successfully against the dev database (confirmed the stale name-only index existed and was dropped).

## Completion Summary
Changed `updateAttraction`'s duplicate-name check to only conflict when another attraction shares both the name and coordinates, updated the conflict message accordingly, migrated the DB's unique index from name-only to name+coordinates, and documented the 409 in `swagger.yaml`. Confirmed done by the user on 2026-08-21.
