# Task: Consolidate all status chips into one section on the attraction card

Status: intake
Track: B
Track reason: Pure layout/organization of chips that already exist (or are being added by sibling tasks) in `AttractionGridCard.tsx`'s existing badge row — no new visual pattern.

## Problem
Status information about an attraction is currently scattered: `AttractionGridCard.tsx` has a `.badges` row (visited / used-in-trips / child-count — small icon badges overlaid on the photo), while the "Open 24/7" indicator lives entirely separately, inside `AttractionDetailModal.tsx` (line ~370) as a standalone `styles.open24h` span near the opening-hours table — not even in the same component, and not in that modal's own `.chips` div (which is used for mood tags, a different concept). As more status chips are added — permanently-closed ([[permanently-closed-chip]]), year-round ([[attraction-opening-months]]) — they need one deliberate home, distinct from both the existing badge icon row and the mood-tag chips.

## Goal
A new, dedicated **status chips section** exists on the attraction card, holding exactly "24/7", "Year-round", and "Permanently closed" (whichever apply) as labeled chips together — separate from the existing `.badges` icon row (visited/used-in-trips/children) and separate from mood-tag `.chips`.

## Requirements
- Create this status-chips section in `AttractionGridCard.tsx` (the primary card) — and in `AttractionDetailModal.tsx` if it should also show there instead of (or in addition to) its current standalone `open24h` span.
- **Do not** put 24/7 / year-round / permanently-closed into the existing `.badges` row (that row is reserved for the icon-only visited/used-in-trips/children indicators) and **do not** reuse the mood-tag `.chips` div. Build a new section/wrapper for this trio specifically.
- Move the existing "Open 24/7" logic (`isAllDay24h`, currently only in `AttractionDetailModal.tsx`) into this new section so it's no longer a one-off standalone span.
- "Year-round" (from [[attraction-opening-months]]'s `isYearRound` helper) and "Permanently closed" (from [[permanently-closed-chip]]) render from this same section, in a consistent chip style (icon + label, per the design-system rule on interactive/informational chips).
- Chips should only render when applicable (e.g. don't show "Year-round" AND "Permanently closed" together — permanently closed takes precedence since a permanently-closed place isn't meaningfully "open year-round").
- Leave the existing `.badges` icon row (`isVisited`/`usedInTripNames`/`childAttractionCount`) untouched and separate — this task does not merge it into the new status-chips section.

## Constraints
- This task depends conceptually on [[permanently-closed-chip]] and [[attraction-opening-months]] existing — check whether those chips have shipped yet; if not, implement this task's section structure (including migrating the existing 24/7 indicator into it) to accommodate them, and leave clear seams (e.g. a shared `AttractionStatusChips` sub-component usable from both `AttractionGridCard.tsx` and `AttractionDetailModal.tsx`) for the other two to slot in later without further layout rework.

## Out of scope
- Changing what data feeds each chip (that's each chip's own task) — this task is purely about grouping/layout.
