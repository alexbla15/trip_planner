# Task: "Private Trip" Chip on Trip Cards/Views

Status: done

Track: A
Track reason: New visual element (a status chip type that doesn't exist yet — icon, color, placement all need a design decision) shown on high-traffic surfaces (dashboard trip grid, trip detail header); reuses an existing chip *pattern* (`MoodTagChip`) but is a new semantic use of it, not a pure copy-paste of existing tokens.

## Problem
`Trip.isPrivate` already exists and is enforced server-side (private trips are excluded from the public Explore feed, `TripSharingPanel` lets the owner toggle it), but nothing in the UI visibly marks a trip as private when you're looking at it. A user (owner or collaborator) browsing their trips, or looking at trip detail, can't tell at a glance which trips are private vs. shared.

## Goal
Wherever a trip is shown as a card/summary/header to a user who can actually see it (owner or collaborator — private trips are never shown to anyone else), a small "Private" chip/badge is visible if `trip.isPrivate` is true. No chip is shown for non-private trips.

## Requirements
- Add a "Private" chip to:
  - `src/components/TripCard/TripCard.tsx` — the card used in the "My Trips" dashboard grid (`src/app/trips/TripsClient.tsx`)
  - `src/app/trips/[id]/TripDetailClient.tsx` — the trip detail page header (near the trip name, `styles.destination`)
  - `src/components/TripPickerModal/TripPickerModal.tsx` — the trip-picker list rows (used when adding an attraction to a trip from Explore)
- Do NOT add it to `src/components/ExploreCard/ExploreCard.tsx` — that's the public Explore feed, which already server-side filters out private trips entirely (`src/app/api/explore/route.ts`), so a private trip can never reach that card. Adding a chip there would be dead code.
- Follow the existing small-chip visual pattern already used in this codebase (`MoodTagChip` / `.chip` class, also see `AttractionFilter`'s `.filterChip`) — reuse tokens from `docs/DESIGN_SYSTEM.md`, don't invent a new chip shape from scratch. Designer should decide the specific icon (e.g. lock icon) and color for this new "private" semantic meaning, distinct from mood tags.
- Chip must be visible in both light and dark mode (project doesn't currently appear to have a dark mode toggle in scope, but keep contrast accessible per the design system's a11y rules regardless).

## Constraints
- `isPrivate` is already computed server-side on every `Trip` object returned by the API (`formatTrip` in `src/models/Trip.ts`) — this is a pure client-side rendering task, no API/data changes needed.
- Don't change `TripSharingPanel.tsx`'s existing toggle UI/behavior — this task only adds a passive display chip elsewhere, not a new control.

## Out of scope
- Any change to who CAN see a private trip (access control is already correct and untouched)
- The public Explore feed / `ExploreCard.tsx` (private trips already never appear there)
- Collaborator management UI

## Design Brief

**New component: `PrivateChip`** (`src/components/PrivateChip/`, same file structure as `MoodTagChip`: `.tsx`, `.module.css`, `.types.ts`, `index.ts`).

Visual spec — mirrors `MoodTagChip`'s `.chip` class exactly (same padding/radius/font so it sits flush in a row next to mood chips), with fixed (non-lookup) colors:
```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  color: #475569;              /* slate-600 */
  background: #F1F5F9;         /* slate-100 — same value as --color-bg-subtle */
}
:global([data-theme="dark"]) .chip {
  color: #CBD5E1;               /* slate-300 */
  background: rgba(255,255,255,0.08);
}
```
Icon: Lucide `Lock`, `size={11}` (matches `MoodTagChip`'s icon size), `aria-hidden="true"`. Label text: "Private". Neutral slate tone is deliberate — distinct from every existing Mood Tag color (all warm/saturated hues per the Mood Tag Colors table), reads as a muted status/restriction indicator rather than an exciting attribute. Contrast: #475569 on #F1F5F9 exceeds 4.5:1 (AA).

Component API:
```ts
interface PrivateChipProps {
  className?: string;
}
```
No `tag` prop needed (unlike `MoodTagChip`) — this chip has exactly one state (rendered or not rendered), gated by the caller checking `trip.isPrivate` before rendering `<PrivateChip />` at all. Same `className` passthrough convention as `MoodTagChip`.

Placement (reuse each surface's existing mood-tag row — no new positioning/overlay CSS needed):
1. **`TripCard.tsx`**: inside the existing `.tags` row (line 36-40), prepended before the mapped `MoodTagChip`s: `{trip.isPrivate && <PrivateChip />}` then the existing `moods.slice(0,2).map(...)`. Destructure `isPrivate` from `trip` alongside the existing fields.
2. **`TripDetailClient.tsx`**: inside the existing `.heroTagRow` (line 582-591) — same prepend pattern, before the mapped mood chips. If `moods.length === 0` but `isPrivate` is true, the row must still render (currently gated by `moods.length > 0`) — change that condition to `(isPrivate || moods.length > 0)` so the chip isn't silently dropped for a private trip with no mood tags.
3. **`TripPickerModal.tsx`**: inside `.itemInfo` (line 119-127), as a small flex row wrapping `itemName` + chip: `<span className={styles.itemNameRow}><span className={styles.itemName}>{trip.name}</span>{trip.isPrivate && <PrivateChip />}</span>` — add `.itemNameRow { display: flex; align-items: center; gap: 6px; }` to `TripPickerModal.module.css`.

No new design tokens introduced — `#475569`/`#F1F5F9` are existing slate values already used elsewhere in this design system (`--color-text-secondary` is slate-700 territory, `--color-bg-subtle` IS `#F1F5F9`); `Lock` is a new icon for this app but from the already-adopted Lucide set, no new icon library.

Accessibility: chip text "Private" plus the `Lock` icon together (icon is decorative/`aria-hidden`, text carries the meaning) — satisfies "don't convey status by icon/color alone." Touch target: this is a passive display element, not interactive, so no 44px tap-target requirement applies.

## Implementation Notes
- Files created: `src/components/PrivateChip/PrivateChip.tsx`, `PrivateChip.module.css`, `PrivateChip.types.ts`, `index.ts`.
- Files modified: `src/components/index.ts` (barrel export), `src/components/TripCard/TripCard.tsx`, `src/app/trips/[id]/TripDetailClient.tsx` (also changed the hero tag row's render condition from `moods.length > 0` to `isPrivate || moods.length > 0` per the brief, so the chip isn't dropped for a private trip with no mood tags), `src/components/TripPickerModal/TripPickerModal.tsx` + `.module.css` (new `.itemNameRow` flex wrapper).
- Deviations from brief: none.
- New design tokens used: none — chip colors (`#475569`/`#F1F5F9`) and the `Lock` icon are exactly as specified in the Design Brief, both already-established values/sets in this codebase.
- No API/route changes — `isPrivate` was already present on every `Trip` API response (`formatTrip`), confirmed via a live request against the real API (create a private trip → `GET /api/trips` list and `GET /api/trips/:id` both return `isPrivate: true`). `swagger.yaml` unchanged, correctly, since no schema changed.
- `tsc --noEmit`: clean. `eslint` on all touched files: only pre-existing `react-hooks/set-state-in-effect` errors in `TripDetailClient.tsx`/`TripPickerModal.tsx` (unrelated to this change, present before it), nothing new.

## Redesign (user feedback after first review)
User asked for a different placement/emphasis than the initial brief: on `TripCard`, show the chip as a floating badge over the cover image's top-right corner (not inline with mood tags) and recolor the card's border when private; on the trip detail hero, drop the inline chip from the text content entirely and instead show a larger, bolder badge in the hero image's top-right corner.

- `PrivateChip` gained a `size?: "sm" | "lg" | "xl"` prop (default `"sm"`) instead of being visually fixed:
  - `sm` (unchanged): the original pale slate-on-slate inline style — still used in `TripPickerModal`'s list rows (plain surface, not an image).
  - `lg`: a new dark-scrim/white-text on-image style (`rgba(15,23,42,0.82)` background, white text, bigger padding/icon) for the `TripCard` cover-image badge.
  - `xl`: same on-image treatment scaled up further, for the much larger trip-detail hero image.
  - Mid-review, the user reported the `lg` badge was "almost transparent" on the card — the *first* pass had reused the original pale `sm` colors for the overlay too, which barely registered against a photo. Root cause: a subtle chip designed for a light card body has no business sitting on arbitrary photo content — needed a dedicated high-contrast "on-image" treatment, not just a bigger version of the same colors. Fixed by giving `lg`/`xl` their own dark-scrim styling instead of reusing `sm`'s palette at a larger size.
  - Then a further round: `lg` was still too small for the hero specifically ("much larger... it is a big picture") — added the separate `xl` size rather than stretching `lg` to serve both a ~280px card and a 320–420px-tall hero well.
- `TripCard.tsx`/`.module.css`: chip moved out of `.tags` into a new `.privateBadge` (`position:absolute; top:12px; right:12px`) inside `.imageContainer`, following the same top-right floating-badge technique already established in `ExploreCard.module.css`'s `.tagBadge`. `.card` gained a `2px solid transparent` default border (via the global `box-sizing:border-box` reset, so it never shifts layout) and a `.cardPrivate` modifier that recolors it to `#475569` (same slate tone as the `sm` chip, ties the card-level and badge-level "private" signal together).
- `TripDetailClient.tsx`: the inline `<PrivateChip>` was removed from `.heroTagRow` (reverted that row's render condition back to `moods.length > 0`, matching original behavior exactly for non-private trips) and added as a second flex child inside the existing `.heroTopBar` (`justify-content: space-between`, so it lands top-right of the hero image next to the top-left "My Trips" back link, with zero new positioning CSS needed).
- Files touched in this round: `PrivateChip.tsx`, `PrivateChip.types.ts`, `PrivateChip.module.css`, `TripCard.tsx`, `TripCard.module.css`, `TripDetailClient.tsx`. `TripPickerModal.tsx` unchanged (still uses the default `sm` size, unaffected by this redesign).
- `tsc --noEmit` and `eslint` on all touched files: clean (no new errors beyond the same pre-existing unrelated ones noted above).

## Completion Summary
Added a "Private" indicator for private trips: a `PrivateChip` component with three size variants (`sm` pale/inline for list rows, `lg`/`xl` dark-scrim on-image badges) shown on the "My Trips" card (top-right of the cover image, plus a recolored card border), the trip detail hero (large badge top-right of the hero image), and the trip-picker modal's list rows. Went through two design iterations from user feedback (on-image contrast, then hero sizing) before landing on the final look. Confirmed good by the user 2026-08-08.
