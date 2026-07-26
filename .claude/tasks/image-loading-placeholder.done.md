# Task: Add loading placeholder for images

Status: done
Track: B
Track reason: A skeleton/shimmer loading convention already exists in the codebase (`TripCardSkeleton`, `.skeletonImage`, `.skeletonCircle`/`.skeletonLine` shimmer classes) — this extends an existing pattern to uncovered call sites rather than inventing a new one.

## Problem
Several places render `next/image` directly with no loading state or fallback, so users briefly see a blank/broken area while an image (trip photo, avatar, attraction thumbnail) loads or if the URL fails.

## Goal
Every image render shows a skeleton placeholder while loading, using the existing shimmer pattern already established in the codebase.

## Requirements
- Apply the existing skeleton/shimmer placeholder pattern (matching `TripCardSkeleton`'s `.skeletonImage` styling) to image renders that currently lack one:
  - `src/app/trips/[id]/TripDetailClient.tsx` (lines ~605, 618, 769)
  - `src/components/ExploreCard/ExploreCard.tsx` (~line 33)
  - `src/components/TripSharingPanel/TripSharingPanel.tsx` (~lines 204, 273)
  - `src/app/profile/ProfileClient.tsx` (~line 295)
- Placeholder shows while the image is loading, and is removed once loaded.
- [[feedback-avatar-url-check]] applies where avatars are involved — do not gate rendering on `startsWith("http")`.

## Constraints
- Reuse the existing shimmer CSS convention rather than introducing a new animation/style.
- No new dependencies (no blur-hash libraries etc.) — CSS shimmer only, matching current pattern.

## Out of scope
- Image error/broken-URL fallback UI (separate concern unless trivial to include alongside the loading state).
- Changing image sources, sizes, or `next/image` config.

## Implementation Notes
- Files created/modified:
  - `src/components/ImageWithSkeleton/` (new) — `ImageWithSkeleton.tsx`, `.module.css`, `.types.ts`, `index.ts`. Wraps `next/image`: renders a shimmer overlay (same gradient/animation convention as `TripCardSkeleton`) until `onLoad` fires, then fades the image in via opacity transition. Accepts all `next/image` props plus `wrapperClassName`; supports both `fill` and `width`/`height` usage.
  - `src/components/index.ts` — barrel export for `ImageWithSkeleton`.
  - `src/app/trips/[id]/TripDetailClient.tsx` — owner/collaborator avatars (~605, 618) and attraction thumbnail (~769) now use `ImageWithSkeleton`.
  - `src/components/ExploreCard/ExploreCard.tsx` — cover image (`fill`) and user avatar now use `ImageWithSkeleton`.
  - `src/components/TripSharingPanel/TripSharingPanel.tsx` — collaborator list avatar and search-dropdown avatar now use `ImageWithSkeleton`.
  - `src/app/profile/ProfileClient.tsx` — avatar-picker option images (~295) now use `ImageWithSkeleton`.
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` — photo (`fill`) now uses `ImageWithSkeleton` (added after user flagged this call site directly during review — not in the original requirements list).
- Deviations from task requirements: built one reusable component instead of duplicating skeleton markup/CSS at each of the 6 call sites (DRY per `docs/LEARNINGS.md`/qc conventions) — same visual result, single source of truth.
- New design tokens used: none — reused existing `--color-bg-subtle`/`--color-border-subtle`/`--duration-base`/`--easing-out` tokens and the shimmer gradient pattern already established in `TripCardSkeleton`.
- Note: `ProfileClient.tsx` line ~254 and `TripDetailClient.tsx` line ~494 have separate `<Image>` usages not covered by this task's listed line numbers — left untouched per task scope.

## Completion Summary
Built a reusable `ImageWithSkeleton` component (shimmer overlay that fades to the loaded image, reusing the existing shimmer convention from `TripCardSkeleton`) and applied it across avatars/thumbnails in `TripDetailClient`, `ExploreCard`, `TripSharingPanel`, `ProfileClient`'s avatar picker, and `AttractionDetailModal`'s photo. Confirmed by user, closed 2026-07-26.
