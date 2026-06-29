# Task: Add Residence Entry (Hotel / Apartment / etc.)

Status: intake

Track: A
Track reason: new form surface with specialized fields (stay dates, residence type, price); no existing pattern for subtype-specific attraction forms

## Problem
Travelers have nowhere to record their accommodation within a trip — where they're staying, for how long, how much it costs, and what type it is. This information is central to the trip but currently can't be stored.

## Goal
A dedicated "Add Residence" flow that stores accommodation details as a special attraction subtype, visible on the trip detail page alongside regular attractions.

## Requirements

### Data model (`Attraction`)
Add optional fields (all optional, only set for residence subtype):
- `subtype?: "residence" | "flight"` — discriminator
- `residenceType?: "Hotel" | "Apartment" | "Hostel" | "Villa" | "Other"`
- `checkInDate?: string` — ISO date (must be within trip's startDate–endDate)
- `checkOutDate?: string` — ISO date (must be within trip's startDate–endDate, ≥ checkInDate)
- `residenceNotes?: string` — free text

### UI — "Add Residence" entry point
- Add a separate "Add Residence" button on the trip detail page (alongside "Add Attraction")
- Opens a dedicated `AddResidenceModal` (or a variant of the attraction modal) with fields:
  - **Name** (required) — e.g. "Marriott Paris"
  - **Residence type** — dropdown or chip selector (Hotel, Apartment, Hostel, Villa, Other)
  - **Check-in date** — date picker (constrained to trip dates)
  - **Check-out date** — date picker (≥ check-in, ≤ trip end)
  - **Price** — number input (uses trip currency)
  - **Notes** — optional textarea
  - Country + City inherited from the trip (pre-filled, editable)
- On save: POST to `/api/trips/[id]/attractions` with `subtype: "residence"` and the new fields

### Display on trip detail
- Residence entries appear in the attractions list with a distinct icon (e.g. `Building2` or `BedDouble`) and a "Residence" badge
- Show check-in/check-out dates in the list item instead of the generic meta line

## Constraints
- CSS Modules only
- Reuse `NewAttractionModal` patterns where possible (country dropdown, coordinate picker optional)
- The `PUT /api/attractions/[id]` route must also accept the new fields

## Out of scope
- Showing residence on the calendar timeline (future task)
- Room-level details, booking confirmation numbers
