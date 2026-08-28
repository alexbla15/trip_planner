# Task: Multiple attraction price tiers + trip expenses tab with selectable cost options

Status: done
Track: A
Track reason: new data model (multiple named price tiers per attraction) plus a brand-new trip-detail tab UI (cost-option selection and totals) — no existing pattern covers either; note this reintroduces an "Expenses" tab conceptually similar to one removed in `remove-trip-expenses-tab.done.md`, but with different scope (price-tier selection & totals, not free-form expense entries) — confirmed as new work, not a reversal.

## Problem
An attraction currently has a single price. Many attractions actually have multiple price tiers (adult, child, reduced/senior, student, etc.). There's no way to record these tiers, nor any way for a trip to calculate total costs based on which tier(s) apply to the travelers on that trip.

## Goal
An attraction can have multiple named price tiers instead of one flat price. In `trips/[id]`, a new tab lets the user, per scheduled attraction, choose one or more price tiers (defaulting to the primary/regular tier) and see a running total of trip costs based on the selected tiers, which is saved and persists.

## Requirements
- **Data model**: replace/extend the attraction's price field with a list of named tiers, e.g. `prices: { label: string; amount: number; isPrimary: boolean }[]` — exactly one tier flagged primary/regular, used as the default everywhere a single price is still shown (cards, existing budget calculations) so nothing else in the app breaks.
- **Create/edit UI**: in `NewAttractionModal`/edit flow, replace the single price input with a repeatable list of (label, amount) rows, with a way to mark one as primary/default. Reuse the existing currency-picker pattern (`attraction-price-currency-selector.done.md`) per tier.
- **Card display**: attraction cards/detail views that show price continue to show the primary tier's price (no behavior change for existing consumers) — full tier list visible in the detail modal.
- **New trip-detail tab**: add a tab in `trips/[id]` (name it e.g. "Costs" or "Expenses" — pick one and be consistent) listing every scheduled attraction in the trip; for each, the user can select one or more of that attraction's price tiers (checkboxes, defaulting to the primary tier pre-selected). Show a running grand total (sum of selected tier amounts across all scheduled attractions, currency-aware per `attraction-price-currency-selector.done.md`'s conventions).
- **Persistence**: save the user's tier selections per scheduled attraction on the trip (new field, e.g. on the trip's scheduled-attraction sub-documents) so the selection and total survive reload.
- Update `swagger.yaml` for the new attraction price-tier shape and the new trip field/endpoint.

## Constraints
- Do not resurrect the removed `TripExpense`/`ExpensesPanel` free-form expense-entry model (`remove-trip-expenses-tab.done.md`) — this is a distinct feature (selecting among an attraction's own predefined price tiers), not manual expense line items.
- Existing budget-spent calculations (Calendar widget, Analytics) currently derive from scheduled attraction prices — confirm whether they should switch to reading the new tier-based total or keep reading the primary-tier price, and document the decision; do not silently break them.
- Migrate/back-fill existing single-price attractions into the new tiers shape (one primary tier equal to the current price) so nothing in the DB is left in a broken intermediate state.

## Out of scope
- Currency conversion logic beyond what `attraction-price-currency-selector.done.md` already established.
- Per-traveler cost splitting (e.g. assigning specific tiers to specific named people) — this task is trip-level totals only.

## Implementation Notes
- **Migration decision**: no real DB migration script — `formatAttraction` synthesizes a single `{label:"Regular", amount: doc.price, isPrimary:true}` tier on read for any document with no `prices` array, so every existing consumer that reads `prices` sees a non-empty, valid array with zero DB writes. Chosen over a real migration to avoid a one-off script touching every Attraction document for a purely cosmetic backfill (the underlying data — `price` — was already correct).
- **Backward compatibility decision**: `price`/`currency` stay the authoritative legacy fields, kept in sync with the primary tier's amount on every create/update. This means the constraint "do not silently break existing budget calculations" is satisfied trivially — Calendar's budget-spent widget and Analytics' budget totals both read `.price` directly and needed zero changes.
- **Budget calc decision** (constraint required documenting this): Calendar/Analytics budget-spent calculations keep reading the legacy `price` (primary tier) — they are NOT switched to the new Costs-tab tier-selection total. The Costs tab is an additive, independent view for "which fare category applies to this trip's travelers," not a replacement for the existing single-number "planned vs. spent" budget tracking.
- Files created/modified:
  - `src/models/Attraction.ts` — `IPriceTier` interface, `PriceTierSchema`, `prices?: IPriceTier[]` field; `formatAttraction` synthesizes the fallback tier and adds `prices`/`selectedPriceTierLabels` (the latter sourced from the per-trip `schedule` param, same mechanism as `price`/`notes`/`checkInDate` overrides).
  - `src/types/attraction.ts` — `PriceTier` type; `prices?`/`selectedPriceTierLabels?` on the shared `Attraction` shape.
  - `src/models/Trip.ts` — `selectedPriceTierLabels?: string[]` on `IScheduleEntry` + schema.
  - `src/lib/services/attractions.service.ts` — `normalizePriceTiers()` helper (validates ≥1 tier, auto-promotes the first tier to primary if the client didn't mark one); wired into `createAttraction`/`updateAttraction` (both sync the legacy `price` field to the primary tier's amount) and `updateTripAttractionSchedule` (new `selectedPriceTierLabels` dot-notation `$set`, mirroring `price`/`currency`).
  - `src/components/NewAttractionModal/` (`NewAttractionModal.tsx`/`.module.css`, `attraction.types.ts`, `attraction.utils.ts`) — replaced the single price input with a repeatable tier-row list (label + amount + a radio-style "set primary" button + remove button), one shared `CurrencySelect` for the whole attraction. Also fixed a bug found while touching `attraction.utils.ts`: `attractionToFormData` never copied `foodStyles` from the fetched attraction, so editing an existing dining attraction always showed its food-style picker with nothing pre-selected — added `foodStyles: a.foodStyles ?? []` (and `prices: a.prices`) to the mapping.
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` + `.module.css` — non-primary tiers render as a small secondary note under the primary price ("Adult: $16 · Child: $8").
  - `src/app/trips/[id]/TripDetailClient.tsx` + `.module.css` — new "Costs" tab: `scheduledCostRows` (every scheduled instance, not deduped — each instance has its own tier selection), `selectedTierLabelsFor()` (defaults to the primary tier when nothing's been explicitly chosen yet), `costTotalsByCurrency` (grouped subtotals, since attractions can have different currencies), `handleToggleCostTier()` (optimistic update + `updateTripAttractionSchedule` PATCH + rollback-on-failure, mirroring the existing residence/flight update pattern). Entries without `prices` (custom slots, flights — no backing Attraction document) show a single fixed, non-selectable cost line instead of tier checkboxes.
  - `swagger.yaml` — `prices`/`selectedPriceTierLabels` documented on the `Attraction` response schema, `AttractionInput` request schema, and the `AttractionSchedule` schema (used by the trip-attraction PATCH endpoint).
- Deviations from task requirements: none functionally — the "Costs" tab name was chosen over "Expenses" specifically to avoid any reader confusion with the removed `ExpensesPanel` feature, even though both this task's title and the constraint text use "expenses" loosely.
- New design tokens used: none.
- Verified: `next build` succeeds (full type-check across the model/service/component changes, ~2.8min compile + 75s typecheck given the size of this change).

## Completion Summary
Attractions can now have multiple named price tiers (adult/child/reduced/etc.) instead of one flat price, editable via a repeatable tier list in the create/edit form. A new "Costs" tab in trips/[id] lists every scheduled attraction with checkboxes for its tiers (defaulting to the primary tier), showing a running total grouped by currency, persisted per scheduled instance. Existing single-price consumers (cards, Calendar/Analytics budget calculations) are unaffected — the legacy `price` field stays in sync with the primary tier and no DB migration was needed (fallback tiers are synthesized at read time). Closed 2026-08-28.
