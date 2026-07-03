# Task: Add Residence Entry (Hotel / Apartment / etc.)

Status: done

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
- Showing residence on the calendar timeline (future task) — `plannedDate`/`plannedTime` left null deliberately
- Room-level details, booking confirmation numbers
- Editing residence detail fields (check-in/out, type) after creation — user must delete and recreate

## Design Brief

### Architecture decisions
- **`subtype` discriminator stored on Attraction**: all new fields are optional on the Mongoose schema; existing attraction endpoints handle them additively without validation impact on existing entries.
- **`types` array still populated**: `types: [residenceType]` (e.g. `["Hotel"]`) for entries where residenceType is one of the 4 known ATTRACTION_TYPES. When "Other" chosen, `types: []`. This keeps calendar color lookups, search/filter, and ICONS map working with zero special-casing.
- **Reuse `notes` and `price` fields**: rather than new `residenceNotes`/`residencePrice` columns — cleaner schema, same UX effect.
- **Date constraints**: `checkInDate` / `checkOutDate` use `<input type="date">` with `min`/`max` bound to `trip.startDate`/`trip.endDate` via `new Date(x).toISOString().split("T")[0]`. `checkOutDate min` = `checkInDate`.
- **Currency**: pass `trip.currency` to modal; prefix price with `currencySymbol(currency)`.
- **No dedicated edit modal**: the pencil (Edit) button in the list is hidden for subtype entries (no generic edit form is appropriate); Remove still available.

## Implementation Notes
- Files created/modified:
  - `src/types/attraction.ts` — added `subtype`, `residenceType`, `checkInDate`, `checkOutDate`, and all flight fields to shared `Attraction` interface
  - `src/models/Attraction.ts` — added same fields to `IAttraction` interface, `AttractionSchema`, and `formatAttraction()`
  - `src/app/api/trips/[id]/attractions/route.ts` — extended POST body type and `Attraction.create()` to accept all subtype fields
  - `src/app/api/attractions/[id]/route.ts` — added conditional assignments for all subtype fields in PUT handler
  - `src/components/AddResidenceModal/AddResidenceModal.tsx` (new) — modal with name, type, country (read-only), city, check-in/out dates, price, notes
  - `src/components/AddResidenceModal/AddResidenceModal.module.css` (new)
  - `src/components/AddResidenceModal/AddResidenceModal.types.ts` (new)
  - `src/components/AddFlightModal/AddFlightModal.tsx` (new) — modal with airline, flight number, date, dep/arr airport, dep/arr time, gate, seat, price, notes; derives attraction `name` automatically; overnight flight detection
  - `src/components/AddFlightModal/AddFlightModal.module.css` (new)
  - `src/components/AddFlightModal/AddFlightModal.types.ts` (new)
  - `src/components/NewAttractionModal/AttractionTypeChip.tsx` — exported `ACCOMMODATION_ICON` (BedDouble) as a fallback icon for "Other" residence type
  - `src/app/trips/[id]/TripDetailClient.tsx` — added state, handlers, "Add Residence" + "Add Flight" outlined buttons, subtype-aware list rendering (icon fallback, badge, meta line), hidden Edit pencil for subtype entries, modal renders at bottom
  - `src/app/trips/[id]/TripDetailClient.module.css` — added `.addBtnGroup`, `.addBtnSecondary`, `.subtypeBadge`
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` — subtype-aware info grid (residence: type/check-in/check-out; flight: flight number/airline/dep/arr airports+times/gate/seat); opening hours and duration hidden for subtypes
  - `src/components/AttractionDetailModal/AttractionDetailModal.module.css` — added `.timeNote`
  - `src/components/index.ts` — barrel exports for both new modals
- Deviations from brief: reused shared `notes` and `price` fields instead of `residenceNotes`/`flightNotes` to minimize schema additions; flight `name` auto-derived (not a user-facing input); flight `country`/`city` silently inherited from trip (API requires them)
- New design tokens used: none

### New schema fields (added to IAttraction, AttractionSchema, formatAttraction, src/types/attraction.ts)
```
subtype?: "residence" | "flight"
residenceType?: "Hotel" | "Apartment" | "Hostel" | "Villa" | "Other"
checkInDate?: string    // "YYYY-MM-DD"
checkOutDate?: string   // "YYYY-MM-DD"
```

### AddResidenceModal component
**Location:** `src/components/AddResidenceModal/AddResidenceModal.tsx` + `.module.css` + `.types.ts`
**CSS approach:** Copy the exact modal shell classes from `NewAttractionModal.module.css` (backdrop, container, header, title, closeBtn, body, field, labelWithIcon, input, select, selectWrapper, selectIcon, priceRow, priceCurrency, priceInput, textarea, footer, cancelBtn, saveBtn, spinner, errorMsg, required, readOnlyField) — same tokens, same breakpoints.

**Fields:**
1. **Name** (required) — `<input type="text">` — "e.g. Marriott Paris"
2. **Residence type** (required) — `<select>` — Hotel / Apartment / Hostel / Villa / Other
3. **Country** (pre-filled from `trip.country`, read-only shown as `.readOnlyField`)
4. **City** (pre-filled from `trip.city` if exists or blank, editable `<input>`)
5. **Check-in date** (required) — `<input type="date">` min=tripStart max=tripEnd
6. **Check-out date** (required) — `<input type="date">` min=checkInDate max=tripEnd
7. **Price** (optional) — price row with `currencySymbol(currency)` prefix
8. **Notes** (optional) — `<textarea>`

**Validation:** name, residenceType, checkInDate, checkOutDate required. checkOutDate ≥ checkInDate enforced by `min` attribute + explicit validation message.

**Save payload** sent to `onSave(data: ResidenceFormData)`:
```ts
{ name, country, city, residenceType, checkInDate, checkOutDate, price, notes,
  types: residenceType !== "Other" ? [residenceType] : [],
  subtype: "residence" }
```

**Props:**
```ts
interface AddResidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ResidenceFormData) => void;
  tripCountry: string;
  tripCity?: string;
  tripStartDate: string;   // ISO string
  tripEndDate: string;
  currency?: string;
}
```

### TripDetailClient.tsx changes
1. Import `AddResidenceModal`, `CATEGORY_ICONS` from constants, `currencySymbol`.
2. Add state: `residenceModalOpen`.
3. Add `handleResidenceSave(data)` → POST to `/api/trips/${trip._id}/attractions` with all residence fields.
4. Add "Add Residence" button (outlined style `.addBtnSecondary`) alongside existing "Add Attraction".
5. Add `AddResidenceModal` render at bottom with trip props.
6. In the list item render block:
   - **Icon override**: when `subtype === "residence"` and `!firstType` → render `<BedDouble>` (import from `CATEGORY_ICONS["Accommodation"]`)
   - **Badge**: render `<span className={styles.subtypeBadge}>Residence</span>` next to name
   - **Meta line**: `"{residenceType} · {formatDisplayDate(checkInDate)} → {formatDisplayDate(checkOutDate)}"` instead of generic
   - **Hide Edit pencil**: `!isOwner || attraction.subtype` (keep Remove only)

### API changes
**`/api/trips/[id]/attractions` (POST):** extend body type & `Attraction.create()` call to pass `subtype`, `residenceType`, `checkInDate`, `checkOutDate`.
**`/api/attractions/[id]` (PUT):** add `if (body.subtype !== undefined)` etc. conditional assignments for all new fields.

### AttractionDetailModal.tsx changes
- When `attraction.subtype === "residence"`: show check-in/check-out date info items and residenceType item; hide opening-hours section and duration section (irrelevant for accommodation).
- Type chips section stays (shows "Hotel" etc. if types populated).

### New CSS: TripDetailClient.module.css additions
```css
.addBtnGroup { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.addBtnSecondary { /* same size/shape as .addBtn but outlined */ }
.subtypeBadge { /* small pill badge */ }
```
