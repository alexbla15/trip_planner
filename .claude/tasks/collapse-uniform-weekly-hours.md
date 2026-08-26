# Task: Collapse identical daily hours into one summary line

Status: reviewing
Track: B
Track reason: Pure display/formatting logic change on existing read-only hours output — no new visual pattern, reuses existing text style.

## Problem
Where opening hours are displayed read-only (e.g. `AttractionDetailModal.tsx`'s hours table, per project learnings this modal has its own read-only rendering of `openingHours`), every day is listed separately even when all 7 days share identical hours (e.g. "Mon 9:00–17:00, Tue 9:00–17:00, ... Sun 9:00–17:00"). This is repetitive and harder to scan than a single summarized line.

## Goal
When an attraction is open every day of the week with the exact same ranges, the hours display shows one condensed line (e.g. "Every day: 9:00–17:00") instead of listing each day.

## Requirements
- Add a helper (in `src/lib/openingHours.ts`) that detects "all 7 days share identical, non-closed `ranges`" and, if so, returns a single summary label; otherwise returns the existing per-day breakdown.
- Wire this helper into every place that renders the per-day hours breakdown read-only — per project learnings, this includes at least `AttractionDetailModal.tsx`'s own hours table (it does not share code with `OpeningHoursGrid.tsx`), so grep for other renderers before assuming there's only one.
- Partial matches (e.g. 6 of 7 days identical, one different) still render the full per-day list — only an exact 7/7 match collapses.
- This is about read-only display only; the edit form (`OpeningHoursGrid.tsx`) keeps showing all 7 day rows for editing regardless of this collapsing.

## Constraints
- Reuse existing formatting/time-string helpers already used to render a single day's ranges (check `src/lib/openingHours.ts` and `AttractionDetailModal.tsx` for existing range-to-string formatting) rather than writing new ones.

## Out of scope
- Collapsing partial groupings (e.g. "Mon–Fri: 9–17, Sat–Sun: 10–14") — only the fully-uniform 7/7 case is required by this task.

## Implementation Notes
- Files created/modified:
  - `src/lib/openingHours.ts` — added `getUniformHoursLabel(hours)`: returns `"Every day: 9:00 – 17:00"`-style string when all 7 days are open (not closed) with identical range arrays, else `null`. Reuses the existing `${r.open} – ${r.close}` join format already used by the per-day table.
  - `src/lib/index.ts` — barrel export.
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` + `.module.css` — the only reader of the per-day breakdown (confirmed via grep for `hoursTable`/`hoursRow` across `src/`). Branches on `getUniformHoursLabel(attraction.openingHours)`: renders the condensed line (new `.uniformHours` style, inside the existing `.hoursCard` bordered container for visual consistency) when non-null, the original day-by-day table otherwise.
  - `OpeningHoursGrid.tsx` (edit form) — untouched, as required; still shows all 7 day rows for editing.
- Deviations from task requirements: none.
- New design tokens used: none — `.uniformHours` reuses the existing `.notes` paragraph's font-size/color/line-height convention.

Verified with `npx tsc --noEmit` (clean) and `npx eslint` on all changed files (clean).
