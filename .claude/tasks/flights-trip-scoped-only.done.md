# Task: Make flights trip-scoped only (not shared global attractions)

Status: done
Track: B
Track reason: Logic/data-model change — schema, API routes, and handler wiring only. No new UI surface; flights must look and behave identically to a user, just be stored differently.

## Problem
Flights are currently stored as regular `Attraction` documents in the global `attractions` collection (`subtype: "flight"`), linked to trips via `Trip.attractionIds` — exactly like reusable attractions (museums, restaurants, residences). This is wrong for flights: a flight is inherently specific to one trip and should never be "picked" from an existing-attractions list by a different trip.

This global-doc model also causes a real bug: `Attraction` has a case-insensitive unique index on `name`. Two different trips creating/renaming flights to the same or similar name collide — either silently reusing the wrong document (via the `Attraction.findOne({name, country})` pre-check in `POST /api/trips/:id/attractions`) or failing with a Mongo `E11000` duplicate-key error, surfaced to the user as "Couldn't update the flight. Please try again." (confirmed live: renaming attraction `6a4a36913a5723b9db8ecd1b` to "LY2367" collided with an unrelated pre-existing document "El Al LY2367").

## Goal
Flights live entirely inside `Trip.schedules` (like the existing `custom-slot` pattern already does for ad-hoc time-slot entries) — no `Attraction` document is created, no cross-trip name collisions are possible, and no trip can ever pick another trip's flight from a search/picker.

## Requirements
- Extend `IScheduleEntry` (`src/models/Trip.ts`) with an `isFlight` flag plus the flight-specific fields currently living on `Attraction`: `flightNumber`, `airline`, `departureAirport`, `arrivalAirport`, `departureTime`, `arrivalTime`, `gate`, `seat`. Reuse the schedule entry's existing `price`, `currency`, `notes`, `plannedDate`, `plannedTime`, `actualDurationValue`, `actualDurationUnit` fields.
- **Create** (`POST /api/trips/:id/attractions`, `src/app/api/trips/[id]/attractions/route.ts`): add a `subtype === "flight"` branch parallel to the existing `subtype === "custom-slot"` branch (lines 160-200) — generate a synthetic `fl-<ObjectId>` key, write directly into `trip.schedules.<key>` via `$set` (bypasses Mongoose strict mode, same as custom-slot), never touch the `Attraction` collection, return a synthesized `AttractionShape`-compatible response.
- **Read** (`GET` in the same file, lines 72-105): reconstruct flights from `trip.schedules` entries flagged `isFlight` via `toObject({ flattenMaps: true })`, same technique as the existing custom-slot reconstruction, and merge into the response array alongside regular attractions and custom slots.
- **Update** (`PATCH /api/trips/:id/attractions/:attractionId`, `src/app/api/trips/[id]/attractions/[attractionId]/route.ts`): add an `isFlight` branch (`attractionId.startsWith("fl-")`) parallel to the `isCustomSlot` branch — accept and `$set` ALL flight fields (name, flight fields, price/currency/notes, planned date/time) in one call, replacing today's two-call sequence (`PUT /api/attractions/:id` + this `PATCH`).
- **Delete** (`DELETE` in the same file, lines 133-140): add an `fl-` branch parallel to the `cs-` branch — just removes the `schedules` entry, no `attractionIds` pull needed since flights are never pushed there.
- **Client** (`src/app/trips/[id]/TripDetailClient.tsx`): simplify `handleFlightSave` (still one `addAttractionToTrip` call, now hits the new branch) and `handleFlightUpdate` (collapse from two calls — `updateAttraction` + `updateTripAttractionSchedule` — into one `PATCH` call against the flight's schedule entry).
- **Migration script** (one-off, run once against the live DB, not committed as a recurring job): for every trip referencing a `subtype: "flight"` Attraction in `attractionIds`, create an independent `schedules.fl-<newid>` entry in that trip with the flight's data (copied, not shared — this is what separates currently-colliding flights). Remove the flight id from `attractionIds` and its `schedules` entry (old key). Once no trip references a given flight Attraction document anymore, delete it from the `attractions` collection. Also handle the legacy fallback case (`types[0] === "Flight"` but no `subtype` set, per the dual-detection already used in `TripDetailClient.tsx`/`CalendarSection.tsx`/`TripDayMapWidget.tsx`).
- `FlightsList`, `CalendarSection`, `TripDayMapWidget`, `AttractionDetailModal` should need no changes — they already key off `subtype === "flight"` and the reconstructed shape stays `AttractionShape`-compatible (mirroring how custom-slot reconstruction already works transparently for those consumers).

## Constraints
- Follow the existing `custom-slot` pattern exactly (synthetic id prefix, `$set` bypass of Mongoose strict mode, `toObject({ flattenMaps: true })` reconstruction on read) rather than inventing a new mechanism.
- Must not break residences or regular attractions — only flights change storage model.
- Migration must be safe to run once against the live dev DB (idempotent or at least safe to re-run without duplicating data) since this is user data, not a fixture.

## Out of scope
- Changing how residences or regular attractions are stored (they remain shared global `Attraction` documents by design).
- Any UI/visual changes — flights should look and behave identically to a user, just be stored differently.

## Implementation Notes
- Files modified:
  - `src/models/Trip.ts` — extended `IScheduleEntry` (+schema) with `isFlight` and the 8 flight-specific fields.
  - `src/app/api/trips/[id]/attractions/route.ts` — GET reconstructs flights from `schedules` entries flagged `isFlight` (parallel to custom-slot); POST adds a `subtype === "flight"` branch writing directly to `schedules.fl-<id>`, no `Attraction` doc created.
  - `src/app/api/trips/[id]/attractions/[attractionId]/route.ts` — PATCH adds an `isFlight` (`fl-` prefix) branch accepting all flight fields in one call; DELETE's `cs-`-only branch now also matches `fl-`.
  - `src/app/trips/[id]/TripDetailClient.tsx` — `handleFlightSave` needed no change (branching is server-side on `subtype`); `handleFlightUpdate` collapsed from two calls (`updateAttraction` + `updateTripAttractionSchedule`) to one `PATCH` against the schedule entry.
  - One-off migration script (run once against the dev DB, not committed): moved all 6 existing `subtype:"flight"` Attraction documents into their referencing trip's own `schedules.fl-<id>` entry (2 were orphaned — no trip referenced them — and were just deleted). Verified 0 flight Attraction docs remain and the migrated entries carry all fields correctly.
- Deviations from brief: none.
- New design tokens used: n/a (backend-only).
- Verified live: dev server restarted (schema change), confirmed via direct API calls — flight create/read/update all work against the real DB; the exact previously-broken rename scenario is now structurally impossible since flights no longer share the `Attraction.name` unique index.

## Completion Summary
Flights now live entirely inside `Trip.schedules` (mirroring the existing `custom-slot` pattern) instead of as shared global `Attraction` documents — eliminating cross-trip name collisions permanently, not just patching the symptom. Migrated all existing flight data with no loss. Verified live against the running dev server and real DB. Closed 2026-07-26.

### Follow-up (same day): hide City/Country in flight read-only view
`AttractionDetailModal.tsx` rendered City/Country unconditionally in its info grid — harmless before, but now flights genuinely have no city/country (both come back as `""` from the schedule reconstruction), so it showed empty rows. Gated both fields behind `!isFlight`.
