# Task: Budget Currency Shows Code Instead of Symbol

Status: done

Track: B
Track reason: display fix — map stored currency code to symbol; no new visual surface

## Problem
The trip stores `currency` as an ISO code (e.g., `"USD"`). All budget display points render the raw code string, so users see "USD 1,000" instead of "$1,000". This applies to:
- Trip overview card in `TripDetailClient.tsx` — the `<span className={styles.currencyBadge}>{currency}</span>`
- Calendar section budget widget in `CalendarSection.tsx` — `{trip.currency ?? "$"}{totalSpend}`  and `of {trip.currency ?? "$"}{trip.budget}`

## Goal
Every budget display in the app shows the currency symbol ("$", "€", "£", "¥") rather than the currency code ("USD", "EUR", "GBP", "JPY").

## Requirements
- Create a small pure util (e.g., `currencySymbol(code: string): string`) that maps known codes to symbols. Place it in `src/lib/formatCurrency.ts` (new file). Mapping needed:
  - "USD" → "$"
  - "EUR" → "€"
  - "GBP" → "£"
  - "JPY" → "¥"
  - fallback: return the code as-is so unknown currencies still display something
- Use this util in `TripDetailClient.tsx` (budget info item) and `CalendarSection.tsx` (budget widget — both the spent label and the "of X budget" label)
- The `NewTripClient.tsx` and `EditTripClient.tsx` currency selector can remain unchanged — the stored value stays as the ISO code; only the display layer changes

## Constraints
- CSS Modules only — no inline styles
- Do not change the stored value in the DB or the trip type definition
- Do not change how the currency selector in the new/edit trip form works

## Out of scope
- Supporting additional currencies beyond the four already in the CURRENCIES list
- Formatting locale-specific number separators

## Implementation Notes
- Files created: `src/lib/formatCurrency.ts`
- Files modified: `src/app/trips/[id]/TripDetailClient.tsx`, `src/app/trips/[id]/CalendarSection.tsx`
- Deviations from task requirements: CalendarSection fallback changed from `"$"` to `currencySymbol("USD")` (produces same "$" but routes through the util for consistency)
- New design tokens used: none


## Completion Summary
Display fix: created src/lib/formatCurrency.ts with currencySymbol() mapping USD/EUR/GBP/JPY to symbols. Applied in TripDetailClient.tsx budget badge and CalendarSection.tsx budget widget. Budget now shows $1,000 instead of USD 1,000. Confirmed by user 2026-06-29.
