# Task: "Permanently closed" chip on attraction card

Status: intake
Track: B
Track reason: Reuses the existing badge pattern in `AttractionGridCard.tsx` (already has `isVisited`, `usedInTripNames`, `childAttractionCount` badges) and existing opening-hours data — no new visual pattern, just a new condition + badge.

## Problem
An attraction can have every day of the week marked `closed: true` in `openingHours`, meaning it's permanently closed. There's currently no way to see this at a glance on the attraction card — a user has to open the edit form and check every day individually.

## Goal
An attraction whose `openingHours` has every day closed shows a "Permanently closed" chip on its card, so users don't plan visits to it.

## Requirements
- Add a helper (likely in `src/lib/openingHours.ts`, alongside `isAllDay24h`) that detects "all 7 days closed" — e.g. `isPermanentlyClosed(openingHours)`.
- Render a "Permanently closed" chip in `src/components/AttractionGridCard/AttractionGridCard.tsx` when this helper returns true — **not** inside the existing icon badge row (`styles.badges`, used for visited/used-in-trips/children-count). This chip belongs in a distinct status-chips grouping alongside the existing (currently misplaced) "24/7" indicator; see [[consolidate-attraction-card-chips]] for that section's structure. If that task hasn't shipped yet, create a minimal dedicated wrapper (not the `.badges` row) for this chip now, so the consolidation task can absorb it later without moving it out of the wrong place first.
- Follow the existing badge visual pattern (icon + label) — per `docs/LEARNINGS.md`, interactive/informational chips need an icon paired with the label.
- This chip should not appear if some but not all days are closed (that's just normal partial hours).

## Constraints
- Reuse `normalizeOpeningHours` from `src/lib/openingHours.ts` rather than reading raw `openingHours` fields directly, for consistency with existing normalization.
- Coordinate visually with the [[consolidate-attraction-card-chips]] task — this chip and the future "year-round"/24/7 chips should end up grouped in one dedicated status-chips section, separate from the `.badges` icon row — but this task can ship independently; the consolidation task will reorganize the section afterward.

## Out of scope
- Any UI to explicitly mark an attraction "closed forever" independent of its weekly hours (e.g. a permanent-closure toggle) — this task only derives the state from existing per-day `closed` flags.
- Filtering/hiding permanently-closed attractions from search results.
