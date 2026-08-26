# Task: Multiple attraction price tiers + trip expenses tab with selectable cost options

Status: intake
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
