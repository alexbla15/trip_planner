# Task: Editor support for setting `region` on attractions

Status: done
Track: B
Track reason: reuses the exact plain-text-input pattern already shipped for the seasonalHours `title` field — no new UI pattern

Goal: [[region-level-hierarchy]] (task 3 of 4)

## Problem
`region` exists on the data model (task 1) and has been backfilled for several countries
(task 2), but NewAttractionModal has no way to set or edit it — so any new attraction, or an
edit to an existing one, can't participate in the region grouping.

## Goal
NewAttractionModal has an optional "Region" text field between Country and City, so region
data can be set on create and edited later, keeping the data set complete going forward.

## Requirements
- New `region` state in NewAttractionModal.tsx, initialized from `initialData?.region ?? ""`
  on open, reset to `""` in `handleReset`
- New field rendered between Country and City (inside the existing `{!parentAttractionId &&
  (...)}` block, so it's hidden for nested attractions exactly like Country/City already are
  — region is inherited from the parent server-side, same as country/city)
- Plain text `<input>`, not a `SearchableSelect` — there's no existing "known regions"
  endpoint to source suggestions from, and adding one is out of scope for this task
- Submitted as `region: region.trim() || undefined` in the `AttractionFormData` payload

## Constraints
- No new API endpoint (no autocomplete/suggestions) — free text only, matching the
  seasonalHours `title` field's exact precedent
- Must not affect the nested-attraction flow (fields stay hidden when a parent is set)

## Out of scope
- A "known regions" suggestions endpoint/dropdown (future enhancement if useful)
- Any Explore page changes (final task in this goal)

## Implementation Notes
- Files created/modified: src/components/NewAttractionModal/NewAttractionModal.tsx (region state, init/reset wiring, submit payload, new field JSX between Country and City reusing the `.input` class)
- Deviations from task requirements: none. Verification note: `tsc --noEmit` and `eslint` both pass with no new issues (2 pre-existing unrelated errors in this file confirmed present before this change too). Live browser smoke-test was attempted but the local dev server was unreachable from this shell at the time (networking issue unrelated to the change, not a code problem) — logic is a direct copy of the already-shipped and manually-verified seasonalHours `title` field pattern.
- New design tokens used: none (reused `.input` and `.field`/`.labelWithIcon` classes already in the module)

## Completion Summary
Added an optional Region text field to NewAttractionModal between Country and City, matching the seasonalHours title field's plain-input pattern. Confirmed by the user 2026-09-06.
