# Task: Scope residence Attraction documents to reusable-only data

Status: done
Track: B
Track reason: Logic/data-model change — schema/route/handler wiring plus a data migration. No new UI surface.

## Problem
Residence `Attraction` documents (shared, reusable places like hotels) carried trip-specific booking data — `checkInDate`, `checkOutDate`, `price`, `notes` — directly on the shared document. This is wrong: those fields describe one trip's specific stay, not the place itself, and baking them onto the shared doc means editing a residence from one trip's context could affect what another trip (or a future trip reusing the same residence) sees.

## Goal
Residence `Attraction` documents hold only reusable, place-level data (name, country, city, coordinates, residenceType). Trip-specific stay data (check-in/out dates, price, currency, notes) lives exclusively in each trip's own `Trip.schedules` entry — mirroring how the flight/custom-slot trip-scoping already works, but residences remain shared documents (unlike flights, which were fully removed from the `attractions` collection in a separate task).

## Requirements
- `POST /api/trips/:id/attractions` (`src/app/api/trips/[id]/attractions/route.ts`): when creating a brand-new residence, stop writing `checkInDate`/`checkOutDate`/`price`/`notes` onto the `Attraction` document — write them to the trip's schedule entry instead (previously this override only applied when picking an *existing* residence via `existingAttractionId`; now it applies to residence creation too, keyed off `subtype === "residence"`).
- `PATCH /api/trips/:id/attractions/:attractionId`: `price`/`currency`/`notes`/`checkInDate`/`checkOutDate` are now universal schedule-override fields (previously `price`/`currency`/`notes` were gated behind the custom-slot-only branch) — safe for any attraction since `formatAttraction` already prefers the schedule value over the document's.
- `TripDetailClient.tsx`'s `handleResidenceUpdate`: split into two calls — `updateAttraction` (PUT) for reusable fields only (name/country/city/coordinates/residenceType/types/subtype), and `updateTripAttractionSchedule` (PATCH) for trip-specific fields (checkInDate/checkOutDate/price/currency/notes).
- One-off migration (run once against the dev DB): for the 3 existing residence documents, moved their baked-in `checkInDate`/`checkOutDate`/`price`/`notes` into each referencing trip's schedule entry (merging rather than clobbering any override a trip may already have set), then stripped those fields off the shared document.

## Out of scope
- Flights (already fully trip-scoped in a separate task — no shared document at all).
- Regular attractions (museums, restaurants, etc.) — their price/notes remain reasonable shared defaults, this task only concerns residences.

## Implementation Notes
- Files modified:
  - `src/app/api/trips/[id]/attractions/route.ts` — residence creation no longer writes `checkInDate`/`checkOutDate`/`price`/`notes` onto the document; schedule-entry override condition changed from `existingAttractionId` to `subtype === "residence"`.
  - `src/app/api/trips/[id]/attractions/[attractionId]/route.ts` — moved `price`/`currency`/`notes` out of the custom-slot-only gate into the universal schedule-set block; added `checkInDate`/`checkOutDate` to the same universal block.
  - `src/app/trips/[id]/TripDetailClient.tsx` — `handleResidenceUpdate` now makes two calls (PUT for reusable fields, PATCH for trip-specific fields) instead of one PUT carrying everything.
  - One-off migration script (not committed, run once): migrated all 3 existing residence documents' trip-specific fields into their referencing trip's schedule entry, then stripped those fields from the shared documents.
- Deviations from requirements: none.
- New design tokens: n/a (backend-only).
- Verified live: created a fresh residence via the real API — confirmed the `Attraction` document has `price: null` and no `notes`/`checkInDate`/`checkOutDate`, while the trip's schedule entry carries all of them; confirmed the migrated "Park Plaza Budapest" residence now reads identically to before (fully merged via `formatAttraction`) despite the underlying storage split. `npx tsc --noEmit` clean throughout.

## Completion Summary
Residence `Attraction` documents now hold only reusable place data; all trip-specific booking info (dates, price, notes) lives in the trip's own schedule entry. Migrated the 3 existing residences with no data loss and no visible behavior change to the user. Closed 2026-07-26.
