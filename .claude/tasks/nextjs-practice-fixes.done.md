# Task: Next.js Practice Fixes

Status: done
Track: B
Track reason: Small UI tweak/refactor using an already-established pattern (`next/image`) and existing page-structure convention — no new visual surface.
Goal: .claude/tasks/goals/architecture-standards-remediation.md

## Problem
- `src/app/page.tsx` is a full Client Component (`'use client'` at the top) with no Server-Component wrapper, unlike every other route in the app, which correctly follows the `page.tsx` (Server) → `XClient.tsx` (Client) split (e.g. `src/app/profile/page.tsx` → `ProfileClient.tsx`).
- `src/app/admin/page.tsx` is a Server Component but is missing a `metadata` export, unlike its sibling pages.
- Raw `<img>` tags are used in 6 places where the rest of the codebase already uses `next/image`'s `<Image>` (14 other files use it correctly): `src/app/profile/ProfileClient.tsx:307`, `src/components/TripSharingPanel/TripSharingPanel.tsx:203,273`, `src/app/trips/[id]/TripDetailClient.tsx:576,590,750`, `src/components/ExploreCard/ExploreCard.tsx:35`.

## Goal
The home page follows the same Server/Client split as every other route, every page has consistent metadata, and image rendering is consistent across the codebase.

## Requirements
- Split `src/app/page.tsx` into a Server Component `page.tsx` and a new `HomeClient.tsx` containing the current client logic/markup, matching the existing pattern used elsewhere (e.g. `src/app/profile/page.tsx` + `ProfileClient.tsx`).
- Add a `metadata` export to `src/app/admin/page.tsx`, consistent in style with the other pages' metadata exports.
- Replace the 6 raw `<img>` tags with `next/image`'s `<Image>`, matching how it's already configured/used elsewhere in the codebase (width/height or fill, existing `next.config` image domains if remote URLs are involved — check `next.config` for any remote-pattern allowlist needed for avatar/cover images).

## Constraints
- Zero visual or behavioral change — this should be indistinguishable to a user.
- If any of the 6 images are dynamic/user-uploaded remote URLs, verify `next.config`'s `images.remotePatterns` (or equivalent) already allows the relevant hosts before swapping to `<Image>`; if not, that's a real blocker to flag back rather than silently work around.
- Can be done independently of the other three tasks in this goal — no file overlap expected, but confirm no merge conflicts if run in parallel.

## Out of scope
- Any other component's client/server structure — only `src/app/page.tsx` is in scope.
- Broader `next.config` changes beyond what's strictly needed to support the `<Image>` swap.

## Implementation Notes
- Files created/modified:
  - New: `src/app/HomeClient.tsx` (client logic/markup moved out of `page.tsx`).
  - `src/app/page.tsx` — now a Server Component with `metadata` export, wrapping `<RouteGuard><HomeClient /></RouteGuard>`, matching the `page.tsx` + `XClient.tsx` pattern used by `profile`/`trips`/etc.
  - `src/app/admin/page.tsx` — added `metadata` export (title/description), matching sibling pages' style.
  - `<img>` → `<Image>`: `src/components/Navbar/Navbar.tsx`, `src/app/profile/ProfileClient.tsx` (2 occurrences), `src/components/TripSharingPanel/TripSharingPanel.tsx` (2), `src/app/trips/[id]/TripDetailClient.tsx` (3), `src/components/ExploreCard/ExploreCard.tsx` (1), `src/components/AttractionDetailModal/AttractionDetailModal.tsx` (1, + added `position: relative` to `.photo` in its CSS module for `fill`), `src/components/CoverImageField/CoverImageField.tsx` (1).
- Deviations from requirements:
  - **The brief's "6 places" list was stale/incomplete.** Re-grepping the current codebase (not trusting the brief's line numbers, which had shifted from the task-3 barrel refactor) found **10** raw `<img>` occurrences across **7** files, not 6 across 4. Two were missed entirely by the brief's audit (`Navbar.tsx`, `AttractionDetailModal.tsx`), and two more (`CoverImageField.tsx`'s preview, and one occurrence each getting undercounted) were only found by a second grep pass without a trailing-whitespace assumption — the first sweep used a `<img\s` pattern that silently missed multi-line JSX tags like `<img\n  src=...`, where `<img` sits alone at end-of-line. Converted all 10 for actual consistency, matching the task's stated Goal ("image rendering is consistent across the codebase") rather than the brief's incomplete sample list.
  - **`CoverImageField.tsx`'s preview uses `unoptimized` on its `<Image>`.** This field accepts arbitrary user-pasted URLs of any protocol (`isValidCoverUrl` only checks `new URL()` doesn't throw — no https restriction), but `next.config.ts`'s `images.remotePatterns` only allows `https` hosts. A plain `<Image>` would silently fail to preview any `http://`-pasted URL that previously rendered fine via `<img>` — a real behavior regression the task's own constraint said to flag rather than silently work around. Found an exact existing precedent already in the codebase for this same scenario: `EditTripClient.tsx`'s live cover-image preview (same underlying field) already uses `<Image fill ... unoptimized />` for exactly this reason. Matched that established pattern instead of introducing a new one.
  - Avatar-image `<img>` tags (Navbar, ProfileClient, TripSharingPanel, TripDetailClient's person avatars, ExploreCard) all use fixed pixel containers (28–80px) — converted with explicit `width`/`height` props (not `fill`), requiring no CSS changes. `AttractionDetailModal`'s photo and `CoverImageField`'s preview use responsive `aspect-ratio` containers — converted with `fill` + `sizes`, matching the `TripCard`/`ExploreCard` cover-image convention (one CSS addition: `position: relative` on `AttractionDetailModal.module.css`'s `.photo`, since `.preview` in `CoverImageField.module.css` already had it).
- New design tokens used: none (Track B, no visual change).
- Verification: `npx tsc --noEmit` clean; `npm run build` succeeds, all 33 routes generated with no anomalies (`/` still static); `npm run lint` matches the established baseline exactly (70 problems: 47 errors, 23 warnings).

## Completion Summary
Split the home page into a Server/Client pair matching the codebase convention, added missing admin page metadata, and replaced all raw `<img>` usage with `next/image` (10 occurrences across 7 files, more than the brief's stale 6/4 count — found via a fresh full-codebase grep sweep). Caught and avoided a real regression in `CoverImageField.tsx`'s arbitrary-URL preview by matching an existing `unoptimized` precedent already in `EditTripClient.tsx`. `tsc`, `npm run build` (33 routes, no anomalies), and `npm run lint` (70/47/23, matching baseline) all pass. Confirmed done by the user on 2026-07-25 — this was the final task in the `architecture-standards-remediation` goal.
