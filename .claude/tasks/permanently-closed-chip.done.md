# Task: "Permanently closed" chip on attraction card

Status: done
Track: B
Track reason: Reuses the existing badge pattern in `AttractionGridCard.tsx` (already has `isVisited`, `usedInTripNames`, `childAttractionCount` badges) and existing opening-hours data — no new visual pattern, just a new condition + badge.

## Problem
An attraction can have every day of the week marked `closed: true` in `openingHours`, meaning it's permanently closed. There's currently no way to see this at a glance on the attraction card — a user has to open the edit form and check every day individually.

## Goal
An attraction whose `openingHours` has every day closed shows a "Permanently closed" chip on its card, so users don't plan visits to it.

## Requirements
- [[consolidate-attraction-card-chips]] has already shipped and established the pattern to follow exactly: add a helper (likely in `src/lib/openingHours.ts`, alongside `isAllDay24h`) that detects "all 7 days closed" — e.g. `isPermanentlyClosed(openingHours)`.
- Add a new condition to `getStatusChips()` in `src/lib/attractionStatusChips.ts` that pushes a `{ key: "permanently-closed", icon, label: "Permanently closed" }` descriptor when `isPermanentlyClosed` is true. This is the *only* wiring needed — `AttractionDetailModal.tsx` already renders whatever `getStatusChips()` returns inline in the Types/category chip row (styled via the existing `.statusChip` class), and already skips the "Opening Hours" heading/table whenever `getStatusChips()` is non-empty. Do not add any new rendering call sites.
- Per the same shipped precedent: **do not** touch `AttractionGridCard.tsx` (the compact grid tile) at all — it intentionally carries no chip/badge representation of status info. This chip only ever appears in `AttractionDetailModal.tsx`.
- This chip should not appear if some but not all days are closed (that's just normal partial hours).
- Chip precedence: if an attraction is both "24/7" and "permanently closed" (contradictory in practice, but check `getStatusChips()`'s existing chip-ordering logic), permanently-closed should take precedence — don't show both.

## Constraints
- Reuse `normalizeOpeningHours` from `src/lib/openingHours.ts` rather than reading raw `openingHours` fields directly, for consistency with existing normalization.

## Out of scope
- Any UI to explicitly mark an attraction "closed forever" independent of its weekly hours (e.g. a permanent-closure toggle) — this task only derives the state from existing per-day `closed` flags.
- Filtering/hiding permanently-closed attractions from search results.

## Implementation Notes
- Files created/modified:
  - `src/lib/openingHours.ts` — added `isPermanentlyClosed(hours)`, alongside `isAllDay24h`, checking every `DAY_KEYS` entry has `closed: true`.
  - `src/lib/attractionStatusChips.ts` — `StatusChipDescriptor` gained an optional `tone?: "primary" | "danger"` field (default primary). `getStatusChips()` checks `isPermanentlyClosed` first and short-circuits, returning just the "Permanently closed" chip (`Ban` icon, `tone: "danger"`) before falling through to the 24/7 check — giving it precedence per the chip-ordering requirement.
  - `src/lib/index.ts` — barrel export for `isPermanentlyClosed`.
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` + `.module.css` — chip rendering now picks `.statusChipDanger` (red, matching the existing `FormErrorBanner` error-surface pattern: `#fef2f2`/`#fecaca`/`--color-error`) vs `.statusChip` (primary blue) based on each descriptor's `tone`. Added per user follow-up request ("make it red") after visually confirming the chip against a real DB record.
  - No changes to `AttractionGridCard.tsx` — confirmed untouched, per the shipped precedent from [[consolidate-attraction-card-chips]].
- Deviations from task requirements: none (tone/color was a follow-up refinement, not a scope change).
- New design tokens used: none — reused the existing error-surface colors already established by `FormErrorBanner.module.css`.
- Verified live against a real DB record: "T Fondaco Dei Tedeschi" (Venice, `_id: 6a6b875abcb00b4b65a150cc`) has all 7 days `closed: true` in the `attractions` collection — confirmed by direct query, 3 such records exist in the DB total.

Verified with `npx tsc --noEmit` (clean) and `npx eslint` on all changed files (clean), including this final color tweak.

## Completion Summary
Attractions with every day of the week marked closed now show a red "Permanently closed" chip in the attraction detail card's Types/category chip row, taking precedence over the 24/7 chip and suppressing the redundant "Opening Hours" table. Verified against a real DB record ("T Fondaco Dei Tedeschi", Venice). Confirmed by user on 2026-08-25.
