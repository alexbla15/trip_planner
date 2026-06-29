# Task: Add Flight Entry

Status: intake

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
