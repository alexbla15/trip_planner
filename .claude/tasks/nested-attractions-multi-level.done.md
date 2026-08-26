# Task: Allow more than 2 levels of attraction nesting

Status: done
Track: B
Track reason: data-model/validation change reusing the existing parent-picker UI pattern from `nested-attractions-create-edit-ui.done.md` — no new visual pattern needed, just relaxed validation and recursive lookups.

## Problem
Nested attractions currently support exactly one level (a child cannot itself be a parent), per a decision confirmed 2026-08-23 and enforced server-side in `nested-attractions-data-model.done.md`. This is a deliberate reversal of that decision: the user now wants arbitrary-depth nesting (e.g. a food court inside a mall, with a specific restaurant inside that food court).

## Goal
An attraction can be nested to any depth (grandparent → parent → child → ...), with every level correctly inheriting coordinates/city/country from its immediate parent and every response exposing enough info to render the full ancestor chain and descendant counts.

## Requirements
- **Schema**: `parentAttractionId` stays a single optional self-reference (no structural change needed) — remove the one-level-only validation in `resolveParentLink` (`src/lib/services/nestedAttractions.service.ts`) that currently rejects a parent which already has its own `parentAttractionId` set.
- **Cycle prevention**: since nesting is no longer capped at 1 level, explicitly guard against cycles (an attraction cannot be an ancestor of itself) — walk the parent chain on set/update and reject if the new parent's ancestor chain already contains the attraction being updated.
- **Inheritance**: coordinates/city/country continue to be copied from the *immediate* parent at creation/update time (unchanged mechanism, now just chains transitively since each parent already inherited from its own parent).
- **Response shape**: `parentAttractionName`/`childAttractionCount` stay as immediate parent/direct-children only (unchanged meaning) — do not need to become full ancestor/descendant lists unless trivial; if the UI tasks in this batch need a full ancestor chain (e.g. "Mall > Food Court > Restaurant" breadcrumb), add a `parentChain?: {id, name}[]` field, batched the same Map-based way as the existing fields.
- **Deletion**: keep blocking deletion of an attraction that has direct children (unchanged rule), which transitively prevents orphaning at any depth.
- Update `swagger.yaml` for the removed one-level restriction and any new field.

## Constraints
- Reuse the existing batched-Map pattern (`getParentNameMap`/`getChildCountMap`) rather than inventing new per-request query patterns; a chain-lookup can do bounded recursive lookups (depth is expected to be small — a handful of levels, not hundreds) but must not N+1 per attraction in a list.
- The existing create/edit UI (`nested-attractions-create-edit-ui.done.md`) already lets you pick any other attraction as a parent — confirm whether it already excludes only "attractions with a parentAttractionId" (which would now over-restrict once children can also be parents) and relax that client-side filter too, keeping only the cycle-safety exclusion (can't pick self or a descendant as your parent).

## Out of scope
- Any change to how nesting is displayed (that's `nested-attractions-detail-display.done.md`'s existing pattern) unless a full ancestor-chain breadcrumb is explicitly needed by this task's response-shape addition — keep any UI touch minimal.
- Map pin deduplication for multi-level children — handled by `nested-attractions-map-dedup-v2.md`.

## Implementation Notes
- Files created/modified:
  - `src/lib/services/nestedAttractions.service.ts` — removed the `parent.parentAttractionId` one-level-only check from `resolveParentLink`; added `selfId` param (optional — absent on create) and a new `chainContains()` helper that walks the candidate parent's ancestor chain (bounded to 50 levels) to reject the case where `selfId` appears in it (a cycle); also rejects the trivial `parentAttractionId === selfId` self-parent case up front without a DB round-trip.
  - `src/lib/services/attractions.service.ts` — update path: removed the `getChildCount(id) > 0` block that previously rejected nesting an attraction with existing children; now passes `id` as `selfId` into `resolveParentLink` so cycle-checking happens there instead. Create path unchanged (no `selfId` — a brand-new document can't yet be anyone's ancestor).
  - `src/components/NewAttractionModal/ParentAttractionPicker.tsx` — relaxed `eligibleResults` filter: no longer excludes candidates that already have a `parentAttractionId` (they can now be picked as a mid-chain parent); still excludes the attraction being edited itself. True cycle prevention (excluding descendants) is left to the server, since the search-result set here doesn't carry full descendant-chain info.
  - `swagger.yaml` — updated `parentAttractionId` descriptions on the `Attraction` schema, `AttractionInput` schema, and the PUT endpoint's description/400 response to describe unbounded depth + cycle rejection instead of the old one-level-only rule.
- Deviations from task requirements: `parentChain`/full ancestor breadcrumb was left out of the response shape — not required by any task in this batch (the existing single-level `parentAttractionName`/`childAttractionCount` fields are unchanged and sufficient for `nested-attractions-detail-display.done.md`'s existing "Part of X" / "Contains N" UI, which only ever needed the immediate parent/direct children).
- New design tokens used: none (backend-only + one client-side filter relaxation).
- Verified: `next build` succeeds (after two follow-up TS fixes: an implicit-any on the lean() result, then a null/undefined mismatch on `parentAttractionId`'s type).

## Completion Summary
Attraction nesting now supports arbitrary depth instead of one level — an attraction that's already a child can itself be chosen as a parent — with cycle prevention (self-parent and descendant-as-parent both rejected with a 400) enforced server-side via a bounded ancestor-chain walk. Confirmed 2026-08-26.
