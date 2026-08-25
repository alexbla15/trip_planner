# Task: "Permanently closed" chip on attraction card

Status: intake
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
