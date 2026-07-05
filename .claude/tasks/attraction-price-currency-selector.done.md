# Task: Add Currency Selector to Attraction Price Field

Status: done

Track: B
Track reason: New form field + schema extension — no new component or layout, uses existing design-system tokens (same pattern as the price input already in the modal)

## Problem
The attraction price input in `NewAttractionModal` shows a hardcoded "$" symbol with no way to change it. Users whose trips are in EUR, GBP, JPY, or any other currency cannot correctly record or update an attraction's price currency. The field is misleading — every price looks like USD.

## Goal
Users can select the currency for an attraction's price (e.g. USD, EUR, GBP) both when creating and when editing an attraction, and the chosen currency is saved and displayed consistently.

## Requirements
- Add an optional `currency` field (string, e.g. `"USD"`) to the Attraction Mongoose schema (default `"USD"`)
- Expose `currency` in `formatAttraction` and the `Attraction` TypeScript type
- Add `currency` to `AttractionFormData` in `attraction.types.ts`
- Replace the hardcoded `$` prefix in `NewAttractionModal` with a `<select>` containing a reasonable set of common currencies (at minimum: USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, BRL, MXN, SGD, AED)
- Pre-fill the currency selector from `initialData.currency` when editing an existing attraction
- Include `currency` in the POST body (create) and PUT body (update) — both already send the full `AttractionFormData`
- Handle `currency` in the POST handler (`/api/attractions`) and PUT handler (`/api/attractions/[id]`) — write it to the DB
- Display the saved currency symbol (not just "USD") wherever the attraction price is shown (e.g. in `AttractionDetailModal`, `CalendarSection` spend total)
- Update `swagger.yaml`: add `currency` to the Attraction schema in request and response bodies

## Constraints
- CSS Modules only — no inline styles
- The currency selector must fit within the existing price row in the modal (compact, inline next to the number input)
- Use the existing design-system tokens — do not introduce new spacing or color values
- The list of supported currencies must live in a constants file, not be inlined in the component

## Out of scope
- Currency conversion or exchange rates
- Per-trip default currency auto-filling the attraction currency
- Displaying currency symbols in the calendar timeline blocks (too compact)

## Implementation Notes
- Files created/modified:
  - `src/lib/formatCurrency.ts` — expanded CODE_TO_SYMBOL from 6 to 28 currencies
  - `src/components/NewAttractionModal/attraction.constants.ts` — added `ATTRACTION_CURRENCIES` readonly array
  - `src/components/NewAttractionModal/attraction.types.ts` — added `currency: string` to `AttractionFormData`
  - `src/types/attraction.ts` — added `currency?: string` to `Attraction`
  - `src/models/Attraction.ts` — added `currency` schema field (default "USD"), `IAttraction` interface, and `formatAttraction` mapping
  - `src/components/NewAttractionModal/NewAttractionModal.tsx` — added `currency` state, replaced `<span>$</span>` with currency `<select>` using the existing `selectWrapper` pattern; pre-fills from `initialData.currency`; included in `handleSave` and `handleReset`
  - `src/components/NewAttractionModal/NewAttractionModal.module.css` — replaced unified priceRow box with side-by-side layout; added `.priceCurrencySelect` class; gave `.priceInput` its own border/radius
  - `src/app/trips/[id]/TripDetailClient.tsx` — added `currency` to `attractionToFormData` and `handleAttractionSave` POST body
  - `src/app/api/attractions/route.ts` — POST handler accepts and saves `currency`
  - `src/app/api/attractions/[id]/route.ts` — PUT handler writes `currency` when present
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` — replaced hardcoded `$` with `currencySymbol(attraction.currency ?? "USD")`
  - `swagger.yaml` — added `currency` field to both `Attraction` and `AttractionInput` schemas
- Deviations from task requirements: none
- New design tokens used: none — used existing `selectWrapper`/`selectIcon` pattern from the duration field

## Completion Summary
Added a currency selector to the attraction price field. The `Attraction` schema gained a `currency` field (default `"USD"`), 28 currencies are supported via `ATTRACTION_CURRENCIES` in constants, and the `NewAttractionModal` replaced its hardcoded `$` with a compact inline `<select>`. Currency is saved through POST/PUT API routes and displayed correctly in `AttractionDetailModal` and `CalendarSection`. Confirmed done by user on 2026-07-05.
