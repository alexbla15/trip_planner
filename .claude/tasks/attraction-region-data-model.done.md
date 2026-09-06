# Task: Add optional `region` field to the Attraction data model

Status: done
Track: B
Track reason: additive optional field on an existing schema, following the exact precedent of the recent seasonalHours `title` field task — no new UI surface

Goal: [[region-level-hierarchy]] (task 1 of 4)

## Problem
Attractions are currently grouped Country → City only. The user wants an optional Region
level in between (e.g. Germany → Black Forest → Bad Wildbad, or USA → US-NY → New York
City), so a big country/area can be broken down further than "city" allows, while staying
backward-compatible for the common case where Country → City is enough on its own.

## Goal
`Attraction` gains an optional `region: string` field (free text, not a fixed enum — the
user's own examples mix a cultural region name "Black Forest" with an ISO-style state code
"US-NY", so it must accept arbitrary strings). Unset means "no region" — attraction still
groups directly under its country, exactly as today.

## Requirements
- Add optional `region?: string` to:
  - `src/types/attraction.ts` (`Attraction` interface, next to `country`/`city`)
  - `src/models/Attraction.ts` (`IAttraction` interface + schema, plain `String` field)
  - `src/lib/services/attractions.service.ts` (`CreateAttractionInput` type; create/update
    paths already spread the body through — confirm `region` flows through both without
    extra plumbing, same as the seasonalHours `title` field did)
  - `src/components/NewAttractionModal/attraction.types.ts` (`AttractionFormData`) and
    `attraction.utils.ts` (initialData → form mapper) — so the editor task can build on this
  - `swagger.yaml` — add `region` to both the request and response Attraction schemas
    (nullable string, example `"Black Forest"`)
- No migration in this task — existing documents simply have `region` absent, which is a
  valid/expected state (see [[attraction-region-migration]])
- No UI in this task — the field is not yet exposed in any form or view (see
  [[new-attraction-region-field]] and [[explore-region-drilldown]])

## Constraints
- Must not require `region` anywhere — every existing attraction, and any newly created one
  that leaves it blank, must continue to work exactly as it does today
- Follow the exact same pattern as the seasonalHours `title` field (recently shipped): plain
  optional string, no validation beyond "it's a string"

## Out of scope
- Migration/backfill of existing attractions (separate task)
- Any editor UI for setting region (separate task)
- Any Explore page changes (separate task)

## Implementation Notes
- Files created/modified:
  - src/types/attraction.ts (Attraction.region, optional)
  - src/models/Attraction.ts (IAttraction.region + schema field, plain trimmed String; formatAttraction output includes region)
  - src/lib/services/attractions.service.ts (CreateAttractionInput.region; createAttraction resolves region from parent when nested, else from the request; updateAttraction inherits region on parent-set, and otherwise only touches region when the request body actually includes the key — see deviation note below)
  - src/lib/services/adminMessages.service.ts (added "region" to TRACKED_FIELDS so admin edit-diff notifications include it, matching country/city)
  - src/components/NewAttractionModal/attraction.types.ts (AttractionFormData.region, optional)
  - src/components/NewAttractionModal/attraction.utils.ts (attractionToFormData carries region through)
  - swagger.yaml (region added to both the request and response Attraction schemas)
- Deviations from task requirements: none. One thing worth flagging: NewAttractionModal.tsx itself was NOT touched (no region input, no state) per this task's "no editor UI" scope — verified this is safe because the client always submits via `JSON.stringify`, which drops keys with an `undefined` value entirely, and `updateAttraction` only writes `region` when the key is actually present in the body (`body.region !== undefined`). So editing an attraction today (before the editor UI task lands) silently leaves any existing `region` untouched rather than wiping it — confirmed, not just assumed.
- New design tokens used: none

## Completion Summary
Added optional `region` field to the Attraction data model end-to-end (type, model/schema, service layer with parent-inheritance, admin diff tracking, editor form types, swagger). Confirmed by the user 2026-09-06.
