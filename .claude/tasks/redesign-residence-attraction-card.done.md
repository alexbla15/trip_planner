# Task: Redesign the attraction card for residence-subtype attractions

Status: done
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

## Design Brief

**Current state:** `ResidencesList.tsx` renders each residence as a single flat list row (`.item`) — icon, name, one truncated line of `residenceMeta()` text (`"Hotel · Jun 3 → Jun 6 · Paris · $450.00"`), a second truncated line for notes, and hover-revealed edit/delete buttons. There's already an established amber color identity for residences (`#d97706` / `#fef3c7` background) used consistently for the icon circle, "Add Residence" button, and hover states — keep that identity, don't introduce a new color.

**Redesign: expand each row into a two-tier card, still in a vertical list (not a grid — residences are typically few per trip, a list reads better than a grid here).**

Per-residence card structure (replaces `.item`):
1. **Header row:** icon circle (existing amber `BedDouble` icon, unchanged) + name (bold, existing `.itemName` size/weight) + a small residence-type pill chip next to the name (reuse the amber palette: `background: #fef3c7; color: #d97706;` pill, `--radius-full`, matching the "Mood Tag Chip" spec in `docs/DESIGN_SYSTEM.md` — padding `4px 10px`, 12px/600). Edit/delete actions stay top-right, but make them always-visible (not hover-only) since this is a list of a handful of important bookings, not a dense grid where hover-reveal reduces clutter — matches the fact that `AttractionGridCard`'s hover-reveal exists specifically because that grid is dense.
2. **Stay-dates block:** the current design's biggest gap — check-in/check-out are buried in a truncated meta string. Give them their own prominent row: `Calendar` icon + "Jun 3 → Jun 6" + a computed **nights count** pill (e.g. "3 nights") to the right, since duration is the single most useful fact about a booking at a glance. Compute nights as `(checkOutDate − checkInDate)` in days (not the inclusive `getDurationDays` helper, which is off-by-one for a "nights" framing — write a small local helper).
3. **Secondary details row:** city (`MapPin` icon) and price (`Wallet` icon, via existing `formatPrice`) side by side, smaller/muted text — same visual weight as `AttractionGridCard`'s `.meta` line.
4. **Notes:** kept as an existing truncated single line, unchanged, if present.
5. **Website link:** if `websiteUrl` is set, show a small link icon/button (reuse `WebsiteLinkButton` compact variant, same component `AttractionGridCard` already uses) in the header row next to the edit/delete actions.

**Data source constraint (per task Constraints above):** every field must come from the already-`formatAttraction`-resolved `Attraction` object passed into `ResidencesList` — `checkInDate`/`checkOutDate`/`price`/`currency`/`notes` already prefer the per-trip `IScheduleEntry` override over the shared document (see `formatAttraction` in `src/models/Attraction.ts`). Do not add any new fetch or read the shared document directly — `ResidencesList`'s existing `residences: Attraction[]` prop already carries the correctly-resolved data; this task only changes how it's rendered.

**No photo support needed:** `AddResidenceModal.tsx` doesn't collect a `photoUrl` for residences (no `CoverImageField`), so don't design around a photo — the icon circle is the only visual anchor, consistent with today.

**Visual tokens:** reuse only what's established — the existing amber identity, `docs/DESIGN_SYSTEM.md`'s Mood Tag Chip spec for the new residence-type pill, `--radius-md`/`--radius-full`/`--color-border-subtle`/`--color-text-tertiary` already used elsewhere in this file. No new colors.

Handing off to `/developer` now — implement per the Requirements above plus this Design Brief, then invoke `/product` to report completion.

## Implementation Notes
- Files created/modified:
  - `src/lib/residence.ts` (new) — `getNightsCount(checkInDate, checkOutDate)`, exclusive-of-checkout-day nights count, distinct from the shared inclusive `getDurationDays` helper. Lives in `src/lib/` (not local to one component) since it ended up needed by two surfaces — see the post-review addition below.
  - `src/app/trips/[id]/ResidencesList.tsx` — each residence row restructured into the brief's 5-part layout: header (icon + name + residence-type pill + always-visible website/edit/delete actions), a dates row (check-in → check-out + nights pill, only rendered when at least one date is set — guards against `formatDisplayDate("")` producing "Invalid Date"), a details row (city + price), and the existing notes line. All fields read directly from the `Attraction` prop already resolved by `formatAttraction` — no new data fetching.
  - `src/app/trips/[id]/ResidencesList.module.css` — new `.itemHeader`/`.typeChip`/`.datesRow`/`.datesText`/`.nightsPill`/`.detailsRow`/`.detailItem`/`.websiteBtn` rules, all built from the existing amber identity and design-system tokens already in this file; `.item` changed from a horizontal flex row to a vertical stack to fit the new multi-row layout.
  - `src/lib/attractionDisplay.ts` + `src/lib/index.ts` — removed `residenceMeta()` (and its now-unused `formatPrice` import), which was only ever called from the file just rewritten — confirmed via grep it had no other callers before deleting, so this is dead-code removal, not a behavior change elsewhere.
  - **Post-review addition (per user follow-up — "the view should be changed in attraction card via Explore as well"):** a residence attraction browsed through Explore renders via `AttractionGridCard.tsx`, which previously showed it identically to any other attraction (name/city only — no type, dates, or price). Moved `getNightsCount` to the shared `src/lib/residence.ts` (from a `ResidencesList`-local file) so `AttractionGridCard.tsx` could use it too. Added a `subtype === "residence"` branch there rendering the same three facts (residence-type pill, check-in → check-out with a compact nights suffix, price) in the same amber identity, scaled down to fit the compact grid tile (10–11px vs. the list's 12–13px). `AttractionDetailModal.tsx` was not touched — it already had dedicated residence info-grid items (residenceType/checkInDate/checkOutDate) from before this task, so the "no residence-aware info" gap was specific to the grid tile, not the detail view.
  - **Post-review fix #2 (per user follow-up — duplicate "Hotel" text):** `AttractionDetailModal.tsx` showed a residence's type twice — once as a generic "Types" chip (since `types=[residenceType]` for a residence) and again as a dedicated "Type" info-grid item. Removed the redundant info-grid item; the Types chip row already covers it. Check-in/check-out info items untouched.
  - **Post-review fix #3 (per user follow-up — "opening hours are 24/7 always... nor do you need price/duration, this is per trip"):** the *generic* edit form (`NewAttractionModal.tsx`) is reachable for a residence too — e.g. Explore's "Edit" button on any attraction, including a residence, opens this same modal (`AddResidenceModal` is a separate, trip-scoped form used only within a trip's Residences list). Added `subtype` to `AttractionFormData` (via `attractionToFormData`) so this modal can detect it's editing a residence. When so: the Duration, Price, Opening Hours, and Opening Months sections are hidden entirely — Duration/Price are per-trip concerns for a residence (edited via `AddResidenceModal`/`IScheduleEntry`, not here), and hours/months are forced to 24/7 + year-round (a hotel isn't meaningfully "closed" or seasonal). The underlying `openingHours`/`openingMonths` state is explicitly overridden to the 24/7/year-round shape on load (a real behavior change, not just a hidden no-op), while `price`/`durationValue`/`durationUnit` state is left exactly as loaded from the existing document and never mutated by hidden UI, so saving is a safe no-op for those two fields rather than silently blanking them.
- Deviations from brief: none from the original brief; all three post-review items were explicit user-requested scope expansions/fixes during review.
- New design tokens used: none — every color/radius/spacing value reuses either the existing amber residence identity (`#d97706`/`#fef3c7`) or standard tokens (`--radius-md`, `--radius-full`, `--color-border-subtle`, `--color-text-tertiary`/`-secondary`) already present in each respective file.

Verified with `npx tsc --noEmit` (clean) and `npx eslint` on all changed files (clean), including all post-review fixes.

## Completion Summary
Residences now have a purpose-built card in the trip's Residences list (type pill, prominent check-in/out dates with a nights count, price) and the same treatment scaled down in Explore's grid tile. Cleaned up a duplicate "Hotel"-type display in the detail modal, and the generic edit form now hides Duration/Price/Opening Hours/Opening Months for residences (those are per-trip concerns or always-24/7/year-round by convention for a residence). This closes out the full 8-task batch. Confirmed by user on 2026-08-26.
