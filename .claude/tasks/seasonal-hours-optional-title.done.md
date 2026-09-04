# Task: Optional title for seasonal opening-hours entries

Status: done
Track: B
Track reason: extends an existing field (seasonalHours) with an optional string + adjusts existing tab-label/detail rendering logic; uses existing input, tab, and text patterns already in the design system

## Problem
Each seasonal opening-hours entry (`attraction.seasonalHours[]`) currently has no name —
the tab strip in AttractionDetailModal (and the editor) always labels each tab with its
date range. Users adding several seasons (e.g. "Summer", "Ramadan", "Winter Break") can't
give them a readable name; they just see raw date ranges, which gets hard to scan with
several entries.

## Goal
Each seasonal-hours entry can optionally have a `title`. The tab shows the title when set,
falling back to the date range when not. When a title is shown on the tab, the date range
for that season is displayed explicitly inside the tab's content (since it's no longer
visible in the tab label).

## Requirements
- Add optional `title?: string` field to the seasonal hours entry (type in
  `src/types/attraction.ts`, plus wherever the object is created/validated — API route(s),
  DB schema/model if applicable)
- Editor (NewAttractionModal, wherever seasonal hours entries are added/edited): add an
  optional title input per season entry
- AttractionDetailModal read view:
  - Tab label: `title` if set, else the current date-range formatting (unchanged fallback
    behavior)
  - Tab content: when the entry has a `title`, show the date range explicitly near the top
    of that tab's hours table (it's currently implied by the tab label alone). When there's
    no title, keep current behavior (no duplicate date range needed since it's already the
    tab label)
- Existing seasonal-hours entries without a title must continue to work exactly as today
  (fully backward compatible, no migration needed since the field is optional)

## Constraints
- Reuse the tab strip styling/scroll behavior fixed in the recent pricing-tabs-overflow-scroll
  task (`.priceTabs`/`.priceTab` classes are shared by hours tabs already)
- Follow existing date-range formatting helper(s) if one already exists for seasonal hours

## Out of scope
- Reordering or renaming date-range formatting for the price tiers pivot table (unrelated feature)
- Any change to non-seasonal (base) opening hours

## Implementation Notes
- Files created/modified:
  - src/lib/seasonalHours.ts (SeasonalHoursEntry gains optional `title`)
  - src/types/attraction.ts (Attraction.seasonalHours entry gains optional `title`)
  - src/models/Attraction.ts (ISeasonalHoursEntry + SeasonalHoursEntrySchema gain optional `title`, plain String field)
  - src/lib/services/attractions.service.ts (CreateAttractionInput seasonalHours type gains `title`; create/update paths already pass the object through untouched, no other change needed)
  - src/components/NewAttractionModal/attraction.types.ts (SeasonalHoursEntryInput + SeasonalHoursEntry form-state type gain `title`)
  - src/components/NewAttractionModal/attraction.utils.ts (initialData -> form mapper now carries `title` through)
  - src/components/NewAttractionModal/NewAttractionModal.tsx (load title from initialData; new updateSeasonalHoursTitle handler; title included in submitted payload; added a title text input per season entry, reusing the existing `.input` style)
  - src/components/AttractionDetailModal/AttractionDetailModal.tsx (hoursTabs now carries `label` (title or range) and `rangeLabel` (range, only when a title is set); tab strip renders `label`; hours card shows `rangeLabel` inline above the table when present)
  - src/components/AttractionDetailModal/AttractionDetailModal.module.css (new `.seasonalRangeInline` style for the inline date range)
  - swagger.yaml (added `SeasonalHoursEntry`/`MonthDay` schema components with `title`, and referenced them from both the request and response `seasonalHours` fields on the Attraction schemas — `seasonalHours` had never been documented in swagger before this task, so this closes a pre-existing gap, not just the new field)
- Deviations from task requirements: none
- New design tokens used: none — reused `.input` (editor) and existing text/spacing tokens (`--color-text-secondary`, `--radius-md`, etc.) for the new inline range text

## Completion Summary
Added an optional `title` to seasonal opening-hours entries end to end (type, Mongoose model, editor input, detail-view tab label with date-range fallback, and swagger docs — which also closed a pre-existing gap where `seasonalHours` wasn't documented in swagger at all). Confirmed by the user 2026-09-04.
