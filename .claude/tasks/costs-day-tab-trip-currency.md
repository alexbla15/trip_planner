# Task: Costs tab shows every amount in the trip currency

Status: implementing

Track: B
Track reason: logic/formatting fix in existing Costs tab; no new visual surface.

## Problem
On a trip's Costs tab, some amounts are shown in the attraction's or expense's own currency
(e.g. "GEL 40") while day subtotals and the total use the trip currency. The day tab
subtotals and the total are already converted, but these are not:
- the per-attraction "View prices" summary line (selected count + total)
- price tier unit prices and line totals inside the price-tier popup
- attraction-scoped and general custom expense amounts

Users see mixed currencies on one screen and can't compare costs at a glance.

## Goal
Every amount on the Costs tab (day tabs, rows, popup, expenses, total) is shown in the
trip's currency, with a visible "converting…" hint while a rate is still loading.

## Requirements
- Convert every amount through the existing `toTripCurrency` helper (uses fetched FX rates).
- Format all displayed amounts with the trip currency.
- While any foreign-currency rate is still loading, show a small "Converting…" hint near the total rather than a silently unconverted figure.
- Price tier popup receives an amount formatter from the parent instead of formatting in the attraction's own currency.
- No change to stored data; display only.

## Constraints
- Reuse `toTripCurrency`, `formatPrice`, and the existing FX fetch effect.
- Keep the stepper quantities and save flow unchanged.

## Out of scope
- Changing how FX rates are fetched or cached.
- Editing an expense's currency.
