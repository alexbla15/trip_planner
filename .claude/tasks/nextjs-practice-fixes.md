# Task: Next.js Practice Fixes

Status: intake
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
