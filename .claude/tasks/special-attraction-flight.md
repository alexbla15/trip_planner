# Task: Add Flight Entry

Status: reviewing

Track: A
Track reason: new form surface with specialized fields (flight number, departure/arrival airports, gate, seats); no existing pattern for transport subtype forms

## Problem
Travelers have no way to store flight information within a trip — departure/arrival times, flight number, gate, seat, price. This is critical logistics information that belongs alongside the trip itinerary.

## Goal
A dedicated "Add Flight" flow that stores flight details as a special attraction subtype, visible on the trip detail page with flight-specific display.

## Requirements

### Data model (`Attraction`)
Add optional fields (all optional, only set for flight subtype):
- `subtype?: "residence" | "flight"` — shared discriminator (see residence task)
- `flightNumber?: string` — e.g. "BA2490"
- `airline?: string`
- `departureAirport?: string` — IATA code or full name
- `arrivalAirport?: string`
- `departureTime?: string` — ISO datetime or "HH:MM" on the planned date
- `arrivalTime?: string` — ISO datetime or "HH:MM" (can be next day)
- `gate?: string`
- `seat?: string` — e.g. "14A"
- `flightNotes?: string`

### UI — "Add Flight" entry point
- Add a separate "Add Flight" button on the trip detail page (alongside "Add Attraction" and "Add Residence")
- Opens a dedicated `AddFlightModal` with fields:
  - **Flight number** (optional) — text input
  - **Airline** (optional) — text input
  - **Date** (required) — date picker (must be within trip dates)
  - **Departure airport** (required) — text input
  - **Departure time** (required) — time input
  - **Arrival airport** (required) — text input
  - **Arrival time** (required) — time input
  - **Gate** (optional) — text input
  - **Seat** (optional) — text input
  - **Price** (optional) — number input (uses trip currency)
  - **Notes** (optional) — textarea
- On save: POST to `/api/trips/[id]/attractions` with `subtype: "flight"` and the new fields

### Display on trip detail
- Flight entries appear in the attractions list with a `Plane` icon and a "Flight" badge
- Show departure → arrival airport and time in the list meta line
- e.g. "BA2490 · LHR → CDG · 09:15–11:45"

## Constraints
- CSS Modules only
- Reuse as much of the existing modal/form patterns as possible
- `PUT /api/attractions/[id]` must also accept the new fields

## Out of scope
- Seat map visualization
- Real-time flight status / tracking
- Multi-leg itineraries in one entry
- Calendar display (not designed; `plannedDate`/`plannedTime` left null)
- Editing flight detail fields after creation — user must delete and recreate

## Design Brief

### Architecture (inherits from residence task)
- `subtype: "flight"` stored on Attraction; `types: ["Flight"]` always populated (matches existing Transportation category → Plane icon auto-resolved).
- `country`/`city` silently inherited from trip (not shown in flight form; API requires them).
- **Auto-derived `name`**: flight modal builds name as `"{airline} {flightNumber}".trim()` or `"{departureAirport} → {arrivalAirport}"` if neither airline nor flight number provided — the `name` field (required by API) is NOT a user-visible input in the flight form.
- **Overnight flights**: `arrivalTime` stored as ISO datetime. When user selects date + times: if arrivalTime `<` departureTime (same clock), arrival date is incremented by 1 day.

### New schema fields (added alongside residence fields)
```
flightNumber?: string
airline?: string
departureAirport?: string
arrivalAirport?: string
departureTime?: string   // full ISO datetime "YYYY-MM-DDTHH:MM"
arrivalTime?: string     // full ISO datetime (may be next day)
gate?: string
seat?: string
```

### AddFlightModal component
**Location:** `src/components/AddFlightModal/AddFlightModal.tsx` + `.module.css` + `.types.ts`
**CSS approach:** Same as AddResidenceModal — copy the NewAttractionModal.module.css shell classes verbatim.

**Fields:**
1. **Airline** (optional) — text input
2. **Flight number** (optional) — text input — "e.g. BA2490"
3. **Date** (required) — `<input type="date">` min=tripStart max=tripEnd
4. **Departure airport** (required) — text input — "e.g. LHR"
5. **Departure time** (required) — `<input type="time">`
6. **Arrival airport** (required) — text input — "e.g. CDG"
7. **Arrival time** (required) — `<input type="time">`
8. **Gate** (optional) — text input
9. **Seat** (optional) — text input — "e.g. 14A"
10. **Price** (optional) — price row with `currencySymbol(currency)` prefix
11. **Notes** (optional) — `<textarea>`

**Required fields:** date, departureAirport, arrivalAirport, departureTime, arrivalTime.
**Save payload:**
```ts
{
  name, // auto-derived
  country: tripCountry, city: tripCity ?? tripCountry,
  types: ["Flight"], subtype: "flight",
  flightNumber, airline, departureAirport, arrivalAirport,
  departureTime, arrivalTime, gate, seat, price, notes
}
```
**Props:**
```ts
interface AddFlightModalProps {
  isOpen: boolean; onClose: () => void; onSave: (data: FlightFormData) => void;
  tripCountry: string; tripCity?: string;
  tripStartDate: string; tripEndDate: string; currency?: string;
}
```

### TripDetailClient.tsx additions (on top of residence changes)
- Import `AddFlightModal`.
- State: `flightModalOpen`.
- `handleFlightSave(data)` → POST with all flight fields.
- "Add Flight" button (`.addBtnSecondary`) in the button group.
- In list item render:
  - Flight `subtype`: ICONS["Flight"] via existing `firstType = "Flight"` path → Plane icon auto-resolved, no override needed.
  - Badge: `<span className={styles.subtypeBadge}>Flight</span>`
  - Meta: `"{flightNumber ? flightNumber + " · " : ""}{departureAirport} → {arrivalAirport}{times}"` where times = `· HH:MM – HH:MM` extracted from ISO datetimes.
  - Hide Edit pencil (same rule as residence: `!attraction.subtype` required to show edit).

### AttractionDetailModal.tsx additions
When `attraction.subtype === "flight"`: show Flight number, Airline, Departure airport/time, Arrival airport/time, Gate, Seat as info items; hide opening hours and duration. Keep price/notes/photo.
