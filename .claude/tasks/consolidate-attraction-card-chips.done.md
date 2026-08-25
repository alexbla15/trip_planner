# Task: Consolidate all status chips into one section on the attraction card

Status: done
Track: B
Track reason: Pure layout/organization of chips that already exist (or are being added by sibling tasks) in `AttractionGridCard.tsx`'s existing badge row — no new visual pattern.

## Problem
Status information about an attraction is currently scattered: `AttractionGridCard.tsx` has a `.badges` row (visited / used-in-trips / child-count — small icon badges overlaid on the photo), while the "Open 24/7" indicator lives entirely separately, inside `AttractionDetailModal.tsx` (line ~370) as a standalone `styles.open24h` span near the opening-hours table — not even in the same component, and not in that modal's own `.chips` div (which is used for mood tags, a different concept). As more status chips are added — permanently-closed ([[permanently-closed-chip]]), year-round ([[attraction-opening-months]]) — they need one deliberate home, distinct from both the existing badge icon row and the mood-tag chips.

## Goal
A new, dedicated **status chips section** exists on the attraction card, holding exactly "24/7", "Year-round", and "Permanently closed" (whichever apply) as labeled chips together — separate from the existing `.badges` icon row (visited/used-in-trips/children) and separate from mood-tag `.chips`.

## Requirements
- The labeled chip list (24/7, and later year-round/permanently-closed) renders only in `AttractionDetailModal.tsx` (the full "attraction card") — **not** on `AttractionGridCard.tsx` (the compact grid tile). Per user correction: the grid tile gets no chip representation at all (no chip list, no boolean badge) — it is untouched by this task.
- Per final user correction: the status chips render **in the same row as the existing Types/category chips** (the `.chips`/`.chip` block near the top of the modal), not in their own separate section and not attached to the Opening Hours area. Style them as a distinct-colored variant of the same `.chip` shape so they read as a "fact chip" alongside the type chips.
- When a status chip applies (currently just 24/7), the "Opening Hours" heading + day-by-day table is skipped entirely (redundant with the chip). It only renders when no status chip applies.
- "Year-round" (from [[attraction-opening-months]]'s `isYearRound` helper) and "Permanently closed" (from [[permanently-closed-chip]]) render from the same shared `getStatusChips()` derivation, in the same chip row. Per the heading rule above, those tasks should also get the "skip Opening Hours" behavior automatically once they add their condition to `getStatusChips()` — no further call-site changes needed.
- Chips should only render when applicable (e.g. don't show "Year-round" AND "Permanently closed" together — permanently closed takes precedence since a permanently-closed place isn't meaningfully "open year-round").

## Constraints
- This task depends conceptually on [[permanently-closed-chip]] and [[attraction-opening-months]] existing — check whether those chips have shipped yet; if not, implement this task's derivation function (`getStatusChips`) to accommodate them, so the two future tasks are a one-line addition each with no rendering changes needed at the call site.

## Out of scope
- Changing what data feeds each chip (that's each chip's own task) — this task is purely about grouping/layout.

## Implementation Notes
- Files created/modified:
  - `src/lib/attractionStatusChips.ts` (new) — `getStatusChips(openingHours): StatusChipDescriptor[]`, the extensibility seam. Currently wires in only 24/7 via `isAllDay24h`; future tasks add a condition here (year-round, permanently-closed) with no call-site changes needed. Lives in `src/lib/` (not a `components/` folder) since it ended up as pure derivation logic consumed inline by the modal, not a rendered component of its own — this mirrors the existing `src/lib/openingHours.ts` pattern.
  - `src/lib/index.ts` — barrel export for `getStatusChips`/`StatusChipDescriptor`.
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` + `.module.css` — this is the only place status chips render, and they render *inside* the existing Types/category chips block (`.chips`/`.chip`), not their own section. Added a `.statusChip` modifier class (primary-colored variant of `.chip`) for visual distinction from type chips. Removed the standalone `open24h` span/logic and its CSS rule. The "Opening Hours" heading + day-by-day table now only render when `getStatusChips(...)` returns empty (i.e. no status chip already covers it).
  - `src/components/AttractionGridCard/AttractionGridCard.tsx` + `.module.css` — untouched, confirmed via `git diff` showing no changes. Two earlier passes (a full chip render, then a boolean badge) were tried and removed per user feedback before landing on "no chip representation on the grid tile at all."
- Deviations from task requirements: none (final state matches corrected requirements above; iterated through several rounds of user feedback on where exactly the chips should live — settled on: inline in the Types row of the detail modal only, nothing on the grid tile).
- New design tokens used: none — `.statusChip` reuses the existing `--color-primary`/`--color-primary-light` tokens.

Verified with `npx tsc --noEmit` (clean) and `npx eslint` (clean) after each round, including this final one.

## Completion Summary
Status chips (currently just "Open 24/7", extensible for year-round/permanently-closed later) now render inline in the attraction detail card's existing Types/category chips row, styled as a primary-colored variant of the same chip shape. The "Opening Hours" heading and day-by-day table are skipped when a status chip already covers the situation. The compact grid tile (used in Explore, etc.) is completely untouched — no chip or badge representation there. The reusable derivation logic lives in `src/lib/attractionStatusChips.ts` (`getStatusChips`), designed so the two upcoming chip tasks are one-line additions with no further rendering changes. Confirmed by user on 2026-08-25 after four rounds of placement/scope corrections.
