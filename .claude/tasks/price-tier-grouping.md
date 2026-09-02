# Task: Group price tiers by visitor type and day-type/season

Status: reviewing
Track: A
Track reason: New UI interaction (grouping/toggling within the Prices card) not covered by existing design-system tokens, plus a data-model change.

## Problem
The attraction detail modal's "PRICES" card (`src/components/AttractionDetailModal/AttractionDetailModal.tsx`) renders price tiers as a flat, paginated list of free-text labels (e.g. "Galaxy 3h Adult (Mon-Thu)", "Galaxy 3h Child 3-14 (Fri-Sun & holidays)"). With many tiers, users can't quickly find their own category (visitor type) or compare Mon-Thu vs Fri-Sun/holiday pricing without reading every row.

## Goal
A user viewing an attraction's prices can group and/or filter the price list by visitor type (Adult/Child/Senior/Student) and by day-type/season (Mon-Thu vs Fri-Sun & holidays), instead of scanning a flat paginated list.

## Requirements
- Data model: `PriceTier` currently has only `{ label: string; amount: number; isPrimary: boolean }` (see `src/types/attraction.ts`, `src/models/Attraction.ts` `PriceTierSchema`, `src/components/NewAttractionModal/attraction.types.ts`). Add structured fields (e.g. `visitorType`, `dayType`) needed to group reliably — the current free-text `label` can't be parsed reliably for grouping.
- Existing DB documents already have tiers with only `label`/`amount`/`isPrimary` — plan a one-off migration script (per `docs/LEARNINGS.md` convention: `scripts/*.mjs` raw-updating the collection) to backfill the new fields by parsing existing labels, since Mongoose subdocument schemas silently drop unmapped fields on read.
- Update `normalizePriceTiers` (`src/lib/services/attractions.service.ts`) and the New/Edit Attraction price-tier UI (`src/components/NewAttractionModal/`) so new/edited tiers capture the structured fields going forward.
- Attraction detail modal: replace (or augment) the current flat pagination with grouping/filtering by visitor type and day-type. Exact interaction (grouped sections vs. filter chips/toggles) is a design decision — hand to designer.
- Preserve the existing "Primary" tier highlighting behavior.

## Constraints
- `PriceTier` shape changes must be reflected in: client type (`src/types/attraction.ts`), Mongoose model (`src/models/Attraction.ts`), and the creation/edit UI type (`src/components/NewAttractionModal/attraction.types.ts`) — per the enum/type-sync pattern in `docs/LEARNINGS.md`.
- Requires a dev-server restart after the schema change before testing persistence (Mongoose model caching).
- Must handle attractions with the synthesized single "Regular" price tier (no explicit tiers in DB) gracefully — these won't have meaningful visitor-type/day-type grouping.

## Out of scope
- Changing how prices are displayed elsewhere (e.g. compact card summary, if any) beyond the detail modal's Prices card.
- Currency/localization changes.

## Design Brief

### Data fields (structured, alongside existing `label`)
Add to `PriceTier`:
- `visitorType?: string` — free-text-ish but drawn from a small, extensible set seen in real data: `"Adult" | "Child" | "Senior" | "Student"`. Keep it a plain `string` (not a hard enum) so unusual venues aren't blocked, but the UI treats unrecognized values as their own group.
- `dayType?: "weekday" | "weekend"` — "weekday" = Mon-Thu, "weekend" = Fri-Sun & holidays (this is the actual semantic split seen in the sample data, not literal Mon-Fri/Sat-Sun — keep the existing free-text day-range wording in the tier's own sub-label if it needs to say "Fri-Sun & holidays" verbatim).
- Both optional — tiers without them (the synthesized "Regular" tier, or a venue that doesn't have this structure) fall into a single ungrouped/unfiltered list, unchanged from today's flat behavior.
- Keep `label` as-is for display of the full remaining detail (e.g. duration: "Galaxy 3h") — `label` becomes the *duration/product* description once `visitorType`/`dayType` are pulled into their own fields, not necessarily the full original string. Migration script should parse the existing combined label into: leading duration/product text → new `label`, visitor keyword → `visitorType`, day-range parenthetical → `dayType`.

### UI structure (`AttractionDetailModal.tsx` Prices section)
Replace the flat paginated table with:

1. **Visitor-type filter chip row**, directly under the "Prices" section heading, above the table. Reuse the existing chip visual pattern already used elsewhere in this modal (pill shape, `--radius-full`, `--color-primary-light` background when active) — do not invent a new chip style.
   - Chips: "All" (default active) + one chip per distinct `visitorType` present in this attraction's tiers, in the order first encountered.
   - Only render this row if 2+ distinct visitor types exist among the tiers; if every tier shares the same (or no) `visitorType`, skip the filter entirely and show the flat list as today.
   - Single-select (tapping a type filters to just that type; tapping "All" or the active chip again returns to all).

2. **Table grouped by `dayType`**, in this fixed order: weekday rows first, then weekend rows, with a small subheader row between groups (e.g. "Mon–Thu" / "Fri–Sun & holidays" — reuse the row's exact day-range wording from the original label so venues with different holiday conventions still read correctly). Reuse the existing `hoursTable`/`hoursRow` styling; the subheader row can reuse `styles.hoursDay` typography treatment at reduced opacity, similar to a table section divider — no new component needed.
   - Within each `dayType` group, sort tiers by `visitorType` in first-seen order (stable, not alphabetical — keeps Adult-first venues Adult-first).
   - Tiers with no `dayType` render in their own unlabeled group at the end (or, if none of the attraction's tiers have `dayType` at all, no subheaders render — identical to current flat table).

3. **Primary tier highlight** (`isPrimary` pill) unchanged — it's independent of grouping/filtering and must keep working when a filter hides other tiers but not the primary one (primary tier can be filtered out of view like any other row; it doesn't force itself to stay visible).

4. **Pagination**: since filtering by visitor type will usually shrink the visible list well under the current page size, keep the existing pagination component but have it operate on the *filtered* list (recompute `pricesTotalPages`/reset `pricesPage` to 1 whenever the active filter chip changes). Don't remove pagination — some venues may still have many tiers even after filtering.

### Accessibility
- Filter chips: `role="group"` with `aria-label="Filter prices by visitor type"` on the wrapper; each chip is a real `<button aria-pressed={isActive}>`.
- Day-type subheader rows: not interactive, just a `<tr>` with a single spanning `<td>` — no aria changes needed beyond keeping the table structure valid.
- No new color-only meaning introduced; active-chip state uses background + a border/weight change, not color alone.

### Edge cases
- Attraction with only the synthesized "Regular" tier: no chips, no subheaders, single row — unchanged from today.
- Attraction with `visitorType` set but no `dayType` (or vice versa): render whichever grouping dimension has data; skip the other.
- All tiers share one `visitorType`: skip the filter row (see above), but still group by `dayType` if that varies.

## Implementation Notes
- Files created/modified:
  - `src/types/attraction.ts` — added `visitorType?: string` and `dayType?: "weekday" | "weekend"` to `PriceTier`.
  - `src/models/Attraction.ts` — same two fields on `IPriceTier`/`PriceTierSchema`.
  - `src/components/NewAttractionModal/attraction.types.ts` — `AttractionFormData.prices` widened to include the two fields; added new `PriceTierDraft` type for the form's in-progress row state (uses `""` sentinels for unset select/text values).
  - `src/components/NewAttractionModal/NewAttractionModal.tsx` — price tier rows now have a second "meta" line with a visitor-type text input and a day-type `<select>` (Any day / Weekday Mon–Thu / Weekend Fri–Sun & holidays); wired through initial-load mapping, submit mapping, add/reset defaults.
  - `src/components/NewAttractionModal/NewAttractionModal.module.css` — added `.priceTierGroup`, `.priceTierMetaRow`, `.priceTierMetaInput`, `.priceTierMetaSelect`.
  - `src/lib/services/attractions.service.ts` — `normalizePriceTiers` and both request-body types now pass through `visitorType`/`dayType`.
  - `src/components/AttractionDetailModal/AttractionDetailModal.utils.ts` (new) — pure helpers `getDistinctVisitorTypes`, `filterPricesByVisitorType`, `buildPriceTierGroups`.
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` — Prices section now renders a visitor-type filter chip row (only when 2+ distinct types exist) and groups the table into Weekday/Weekend/ungrouped sections with subheader rows; pagination now operates on the filtered list, with the page clamped defensively when a filter shrinks the list below the current page.
  - `src/components/AttractionDetailModal/AttractionDetailModal.module.css` — added `.priceFilterChips`, `.priceFilterChip`, `.priceFilterChipActive`, `.priceGroupHeadingRow`, `.priceGroupHeading`.
  - `scripts/migrate-price-tier-visitor-daytype.mjs` (new, already run against the real DB) — backfilled `visitorType`/`dayType` on 39 of 251 attractions with explicit price tiers by parsing their existing labels.
- Deviations from brief:
  - **`label` is left completely unchanged, not trimmed down to "duration/product text only".** The brief suggested stripping the visitor/day-range wording out of `label` once the new fields exist. `priceTierQuantities` (`Trip.schedules`) references a tier by its exact `label` string — rewriting labels for every existing tier would silently orphan every trip that already picked a price tier (the stored label would no longer match any tier). `visitorType`/`dayType` are purely additive; the table still displays the full original `label` per row, so nothing is lost, but rows read a bit more redundantly than the brief's mockup implied (e.g. "Adult" appears in both the label text and the day-group heading).
  - **Day-type subheadings use two fixed strings ("Mon–Thu" / "Fri–Sun & holidays"), not per-tier wording pulled from each label.** Since labels aren't parsed/trimmed (see above), there's no per-tier "day-range wording" left to reuse verbatim; a venue with a different holiday convention in its label text will still see the generic heading above its row (the label itself still shows the specific wording).
  - Migration script's visitor-type/day-type parsing is best-effort regex over free text; 212 of 251 attractions had no parseable keyword and were left untouched (no `visitorType`/`dayType` — same as before, falls into the ungrouped/unfiltered flat list).
- New design tokens used: none — reused existing `.chip`-family shape/spacing values and `--color-*`/`--radius-*` tokens already defined in `docs/DESIGN_SYSTEM.md`.
