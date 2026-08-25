# Task: Redesign the attraction card for residence-subtype attractions

Status: intake
Track: A
Track reason: Explicit redesign request for a distinct visual treatment — currently residences don't even have their own card component (they render via `residenceMeta()` formatting inside `ResidencesList.tsx`, not `AttractionGridCard`), so this is new visual design work.

## Problem
Residence-subtype attractions (`subtype: "residence"`) are currently displayed via generic metadata formatting (`residenceMeta()` in `src/lib/attractionDisplay.ts`) inside `src/app/trips/[id]/ResidencesList.tsx` — there's no dedicated card design tailored to what matters for a residence (check-in/out dates, residence type, price, address) the way there is for general attractions.

## Goal
Residence attractions have a purpose-built card design (used wherever residences are currently listed) that surfaces residence-relevant information clearly, distinct from the generic attraction card.

## Requirements
- Needs a Design Brief: what fields matter most for a residence card (residenceType, check-in/out — per-trip override fields on `IScheduleEntry`, not the shared doc — address, price, photo) and how they're laid out.
- Apply the new design to `src/app/trips/[id]/ResidencesList.tsx`'s rendering of each residence.
- Should visually distinguish itself from the standard `AttractionGridCard` (e.g. different layout emphasis) while staying consistent with the app's established design system (`docs/DESIGN_SYSTEM.md`).
- Should still support whatever chip section is established by [[consolidate-attraction-card-chips]] if applicable to residences (e.g. "used in my trips" doesn't typically apply here, but check).

## Constraints
- Per project learnings, per-trip fields like check-in/check-out dates and price for a reused residence document live on the trip's `IScheduleEntry` schedule override, NOT on the shared `Attraction` document — `formatAttraction(doc, schedule)` already prefers `schedule.field ?? doc.field`. The redesigned card must keep reading these through that resolved/formatted shape, not query the shared document directly.
- Check `src/components/AddResidenceModal/AddResidenceModal.tsx` for the full set of residence-specific fields the form already collects, to make sure the card doesn't omit something users can actually set.

## Out of scope
- Changing the residence creation/edit form itself.
- Redesigning the parallel "Flights" card (`flightMeta`/`FlightsList.tsx`) — out of scope unless the user asks for it separately.
