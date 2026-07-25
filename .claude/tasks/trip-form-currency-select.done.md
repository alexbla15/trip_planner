# Task: Use shared CurrencySelect in Add/Edit Trip forms, sorted A–Z

Status: done
Track: B
Track reason: swap-in of an existing shared component + reordering an existing data array; no new visual pattern, everything needed already exists in the design system.

## Problem
`NewTripClient.tsx` and `EditTripClient.tsx` each implement their own native `<select>` for currency (with a manual `<ChevronDown>` overlay), duplicating logic that already exists as a shared, accessible, searchable component (`src/components/CurrencySelect/CurrencySelect.tsx`). This is used correctly in `NewAttractionModal`, `AddResidenceModal`, `AddFreeSlotModal`, `AddCustomSlotModal`, `AddFlightModal`, and `ExpensesPanel`, but not in the trip forms — inconsistent UX and duplicated code. Additionally, the underlying `CURRENCIES` array (`src/lib/currencies.ts`) is hardcoded in a curated geographic-region order, not alphabetical, so the picker (everywhere it's used) doesn't list currencies A–Z.

## Goal
Add Trip and Edit Trip both use the shared `CurrencySelect` component for currency selection, and the currency list is alphabetically ordered everywhere it's rendered.

## Requirements
- Replace the native `<select id="trip-currency">` in `src/app/new-trip/NewTripClient.tsx` (~lines 272–288) with `CurrencySelect`.
- Replace the native `<select id="edit-trip-currency">` in `src/app/trips/[id]/edit/EditTripClient.tsx` (~lines 320–336) with `CurrencySelect`.
- Remove the now-unused manual chevron-overlay markup/CSS (`.currencySelectWrapper`, `.currencySelect`, `.currencySelectIcon`) from `NewTripClient.module.css` / `EditTripClient.module.css` if nothing else uses them — verify before deleting.
- Sort `CURRENCIES` in `src/lib/currencies.ts` alphabetically (by currency name, matching how `CurrencySelect` displays entries — verify display field before choosing sort key) so every consumer of the array (all 6 existing usages plus the 2 new trip-form usages) renders A–Z without needing consumer-side sorting.
- Preserve existing selected-value / onChange / form-field behavior exactly (controlled value, required-field validation, default currency if any).

## Constraints
- `CurrencySelect` already handles keyboard nav, search/filter, and ARIA listbox semantics — do not reimplement any of that in the trip forms.
- Do not change `CurrencySelect`'s own API/props unless the trip-form usage genuinely requires something the other 6 consumers don't already exercise.

## Out of scope
- Changing which currencies are supported (the actual list of codes/names).
- Any other trip-form field changes.

## Implementation Notes
- Files created/modified:
  - `src/app/new-trip/NewTripClient.tsx` — swapped native `<select>` for `<CurrencySelect value={currency} onChange={setCurrency} />`, dropped now-unused `CURRENCIES` import.
  - `src/app/new-trip/NewTripClient.module.css` — removed `.currencySelectWrapper`/`.currencySelect`/`.currencySelectIcon`; `.currencyRow` now `flex` with `gap: 8px`; `.currencyInput` now has full `border-radius` (previously connected-pill radius against the removed select).
  - `src/app/trips/[id]/edit/EditTripClient.tsx` — same swap, dropped now-unused `CURRENCIES` import (kept `ChevronDown`, still used elsewhere in the file).
  - `src/app/trips/[id]/edit/EditTripClient.module.css` — same CSS cleanup as above.
  - `src/lib/currencies.ts` — `CURRENCIES` re-sorted alphabetically by `code` (was grouped by geographic region); all 120 entries preserved, `getCurrency`/`currencySymbol`/`isPostfixCurrency`/`formatPrice` all derive from the array so they pick up the new order automatically.
- Deviations from task requirements:
  - Sort key chosen: `code`, not `name`. The task left this open pending verification — `CurrencySelect`'s closed-state trigger shows only the code (`<span>{value}</span>`), and its open-dropdown option row shows code first/bold with name second/muted, so code is the more prominent, unambiguous (no diacritics) sort key.
  - The connected-pill CSS (select flush against the budget input, shared border) was replaced with a gap-separated pair of independently-rounded boxes, matching the exact pattern already used by `AddResidenceModal`'s `.priceRow`/`.priceInput` (the other existing `CurrencySelect` + amount-input consumer) — not explicitly requested, but necessary since `CurrencySelect`'s own trigger always renders full corner radius and can't be visually "half-rounded" without overriding the shared component's CSS.
- New design tokens used: none — reused existing `--radius-md` token, already used elsewhere in both files.

Verification: `tsc --noEmit` clean, `eslint` on all touched files clean (one pre-existing unrelated warning in `EditTripClient.tsx`), `next build` succeeds with no new prerender/build errors. No API routes touched, so `swagger.yaml` unchanged.

## Completion Summary
Add Trip and Edit Trip now use the shared `CurrencySelect` component, sourced from a `CURRENCIES` array sorted A–Z by ISO code (fixing order everywhere the picker is used, not just these two forms). Per user follow-up request, the default currency on both forms (and the edit form's fallback when a fetched trip has no currency set) was changed from USD to ILS. Confirmed by user 2026-07-25.
