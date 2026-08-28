# Task: Costs tab fixes (schedule/custom slots, day totals, expense currency, save button, visibility)

Status: done
Track: B
Track reason: bug-fix/logic changes to an existing tab — no new visual surface, all values already exist in the design system

## Problem
On `trips/[id]?tab=costs` (`src/app/trips/[id]/TripDetailClient.tsx`):
1. Custom slots (subtype `"custom-slot"`, from `AddCustomSlotModal`/`CalendarSection`) are counted as cost rows even though they have no price — they show up in `scheduledCostRows` (`TripDetailClient.tsx:533-536`, filtered only by `!!a.plannedDate`) and inflate/clutter the day list.
2. Each day's header shows `costsDaySubtotal` as a join of every currency amount with `" + "` (`TripDetailClient.tsx:1374-1376`, via `daySubtotals()` at `TripDetailClient.tsx:647-656`) — reads like an unresolved sum instead of a clean total.
3. The "Add expense" inline form (`TripDetailClient.tsx:1315-1359`) collects label/amount/date but not currency — `handleAddCustomExpense` (`TripDetailClient.tsx:602-626`) always stores the expense under `trip.currency` (see `costTotalsByCurrency`/`daySubtotals`, which key custom expenses by `trip?.currency ?? "USD"`).
4. The inline expense form has an "Add" button (saves immediately per keystroke-of-intent) but no explicit "Save" — clarify/add a save action per requirement.
5. The Costs tab (`TRIP_TABS` at `TripDetailClient.tsx:82-89`, rendered unconditionally to any viewer) is visible to everyone who can view the trip, including non-collaborators on a shared/public trip — it should only be visible to the owner or a collaborator.

## Goal
Costs tab only lists real cost-bearing rows (no custom slots), each day shows one clear total per currency instead of a multi-currency "+" join, adding an expense also captures its currency, the expense form has a working save action, and the whole Costs tab (nav item + panel) is hidden from viewers who are neither the trip owner nor a collaborator.

## Requirements
- Exclude attractions with `subtype === "custom-slot"` from `scheduledCostRows` (`TripDetailClient.tsx:533-536`) so they never appear as cost rows or contribute to day/trip totals.
- Day header: replace the `" + "`-joined multi-currency string with a clean per-day total. If a day only has one currency in play (the common case), show `<amount> <currency>` directly. If multiple currencies genuinely exist for a day, show each as its own total (not concatenated with `+`) — e.g. stacked/separate spans — never an addition-style join.
- `CustomExpense` type (`src/types/trip.ts`) and the `customExpenses` schema (`src/models/Trip.ts`) need a `currency` field (default to `trip.currency` when absent, for backward compatibility with existing stored expenses).
- Add-expense inline form: add a currency select (reuse whatever currency list/component the app already uses elsewhere, e.g. `AddResidenceModal`/`AddFlightModal`'s currency field) alongside label/amount/date, defaulting to `trip.currency`.
- `handleAddCustomExpense` must send the selected currency, and `daySubtotals`/`costTotalsByCurrency` must key custom expenses by each expense's own `currency` (falling back to `trip.currency`) instead of unconditionally using `trip?.currency`.
- Add an explicit "Save" button on the add-expense form (in addition to or replacing "Add" per whichever reads clearer — keep the existing disabled/loading behavior tied to it).
- Gate the Costs tab: only include the `"costs"` entry in the tabs shown to the user, and only render the costs tab panel, when `canEdit` (owner or collaborator) is true — mirror how other permission-gated UI in this file uses `canEdit`. A non-collaborator viewer should not see "Costs" in the tab bar at all, and if the URL still contains `?tab=costs` for such a viewer, fall back to a tab they can see (e.g. `overview`).

## Constraints
- `canEdit` already exists in `TripDetailClient.tsx:771` (`isOwner || isCollaborator`) — use that for the visibility gate, not `effectiveCanEdit` (which also depends on the read-only view-mode toggle and would hide the tab for an owner previewing read-only mode).
- Keep existing behavior for `scheduledCostRows`'s use elsewhere (flights/residences still show as cost rows — only `custom-slot` subtype is excluded).
- `TRIP_TABS` is currently a static top-level `const` — gating it means computing the visible tab list inside the component (where `canEdit` is known), not changing the static array.

## Out of scope
- Currency conversion/exchange-rate logic — multiple currencies are still shown separately, not converted.
- Changes to how custom slots behave in the Calendar/schedule itself (`CalendarSection.tsx`) — only their exclusion from the Costs tab's rows.
- Redesigning the Costs tab's visuals beyond what's needed for the day-total change.

## Implementation Notes
- Files created/modified:
  - `src/app/trips/[id]/TripDetailClient.tsx` — excluded `subtype === "custom-slot"` from `scheduledCostRows`; keyed `costTotalsByCurrency`/`daySubtotals` custom-expense amounts by each expense's own currency (falling back to `trip.currency`); added `customExpenseCurrency` state + `CurrencySelect` to the add-expense form; renamed the form's submit button label from "Add" to "Save"; gated the Costs tab via a new `visibleTabs` list (`canEdit`-filtered) passed to `TripTabBar`, gated the costs panel body on `canEdit`, and added a redirect effect that bounces a non-collaborator off `?tab=costs` to `overview`; changed the day-header subtotal from a `" + "`-joined string to one `<span>` per currency.
  - `src/app/trips/[id]/TripDetailClient.module.css` — split `.costsDaySubtotal` into a flex wrapper plus `.costsDaySubtotalAmount` per-currency span.
  - `src/types/trip.ts`, `src/models/Trip.ts` — added optional `currency` to `CustomExpense`/`ICustomExpense` and the Mongoose schema/`formatTrip` mapping.
  - `src/lib/services/trips.service.ts` — `UpdateTripInput.customExpenses` and the `$set.customExpenses` mapping now carry `currency` through.
  - `swagger.yaml` — added `currency` to both `customExpenses` schemas (Trip response and TripInput).
- Deviations from task requirements: none.
- New design tokens used: none — reused existing `CurrencySelect` component and `saveBtn`/`customExpenseForm` styles.

## Completion Summary
Built the Costs tab fixes: custom slots no longer count as cost rows, day/trip totals show a single amount in the trip's own currency (no conversion, no "+" join — per user follow-up, replaced the earlier per-currency breakdown with one summed total), the add-expense form captures currency via `CurrencySelect` and its submit button reads "Save", and the tab (nav item + panel) is hidden from non-owner/non-collaborator viewers with a redirect off stale `?tab=costs` links. Confirmed by user 2026-08-28.
