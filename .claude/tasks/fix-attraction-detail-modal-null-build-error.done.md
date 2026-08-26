# Task: Fix build-breaking null-check error in AttractionDetailModal

Status: done
Track: B
Track reason: TypeScript null-check bug fix, no visual/behavior change.

## Problem
Production deployment is failing. `next build` fails with a type error in `src/components/AttractionDetailModal/AttractionDetailModal.tsx:119`: `attraction` is typed as possibly `null`, but `getChildAttractions(attraction._id)` is called without a null guard, inside an effect that also checks `children === null && !childrenLoading`.

## Goal
`npm run build` succeeds again; the child-attractions fetch only runs when `attraction` is non-null, with no behavior change when it is present.

## Requirements
- Guard the effect body so `getChildAttractions` is only called when `attraction` is non-null (e.g. add `attraction &&` to the existing condition, or an early return), matching how `attraction` nullability is already handled elsewhere in this same component.
- Verify `next build` completes without type errors.
- Confirm no functional regression: children still load exactly as before whenever an attraction is actually open.

## Constraints
- Minimal, targeted fix — this is a deployment blocker, not a refactor opportunity.

## Out of scope
- Any other changes to `AttractionDetailModal`.

## Implementation Notes
- Files created/modified: `src/components/AttractionDetailModal/AttractionDetailModal.tsx` — added an `if (!attraction) return;` guard at the top of `handleToggleChildren`, and `!attraction ||` to the existing guard in `handleOpenParent`.
- Deviations from task requirements: the build error also existed in a second function (`handleOpenParent`, line 129) referencing `attraction.parentAttractionId` — not mentioned in the original error log, but the same closure-narrowing issue; fixed it too since `npm run build` wouldn't pass otherwise.
- New design tokens used: none.
- Verified: `npm run build` completes successfully with all routes compiled, no type errors.

## Completion Summary
Fixed a TypeScript closure-narrowing bug in `AttractionDetailModal.tsx` that broke production builds — two click handlers referenced `attraction` without their own null guard despite an earlier component-level null check. Confirmed by user, closed 2026-08-26.
