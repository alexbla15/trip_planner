# Task: Official website link on attractions

Status: reviewing
Track: A
Track reason: Requires a new, deliberately "pretty" navigation button component/pattern on attraction cards — not a plain link, and no existing token/pattern in the design system covers it.

## Problem
Attractions in the database currently have no way to link out to the venue's real official website. When a user is looking at an attraction (in a trip's schedule, in Explore, in any attraction card/detail view), there's no quick way to jump to the venue's own site for up-to-date info, tickets, or menus.

## Goal
Every attraction can carry an official website URL; users can add/edit it themselves; and wherever an attraction is shown, a polished navigation button opens that link in a new tab — only appearing when a URL is actually set.

## Requirements
- Add a `websiteUrl` field to the `Attraction` Mongoose schema/model (`src/models/Attraction.ts`) and its TypeScript types (`src/types/attraction.ts` and any form-data type). Optional string, `string | null` — most attractions won't have one until backfilled or added by a user.
- Validate it's a well-formed URL when set (both client and server side) but allow it to be empty/cleared.
- Expose the field for create/update via the attractions API route(s) and service layer (`src/lib/services/attractions.service.ts` or equivalent) so it round-trips like any other editable attraction field.
- Add an input for the website URL to every place an attraction's fields are already added/edited: the new-attraction modal, the edit/detail modal, and the residence modal if residences share this field (confirm during design/dev whether residences should also carry a website link — reasonable to include them for consistency, e.g. a hotel's own site).
- Add a "visit website" navigation button to every attraction card / detail surface across the app (trip schedule cards, Explore attraction markers/detail panel, attraction picker, any other card that renders an attraction) — audit all render sites during implementation rather than guessing a single list. The button must:
  - Only render when `websiteUrl` is set and non-empty.
  - Open the link in a new tab (`target="_blank"`, with `rel="noopener noreferrer"`).
  - Be a deliberately styled, polished button (icon + treatment that fits the existing card designs across light/dark mode) — not a bare `<a>` tag styled as plain text. This is the part that needs a design pass.
- Backfill: for every attraction currently in the database, look up and set its real official website URL where one exists (a throwaway one-off script per the `add-attractions` skill's conventions is fine — reuse `MONGODB_URI` from `.env.local`, batch/parallelize research, and update-by-name rather than reinserting). Leave `websiteUrl` unset for attractions with no real official site (e.g. natural landmarks, generic street markets) rather than guessing a URL — same "never fabricate" bar the add-attractions skill already applies to price/hours.

## Constraints
- Must follow this project's existing CSS Modules styling approach, not a new styling system.
- Backfill research must be real (WebFetch/WebSearch-verified), not guessed — a wrong URL is worse than no URL.
- Should not disrupt the existing add/edit attraction form layout — figure out where this field fits naturally.

## Out of scope
- No requirement to validate that a URL stays reachable/live over time (no periodic link-checking).
- No requirement to fetch/display a site preview, favicon, or metadata beyond the raw link.

## Design Brief

All values below are existing tokens already defined in `src/app/globals.css` (`:root` + `[data-theme="dark"]`) and documented in `docs/DESIGN_SYSTEM.md` — no new tokens needed. Both variants below get light/dark for free because they only ever reference tokens, never raw hex.

### Component: `WebsiteLinkButton`
New shared component, `src/components/WebsiteLinkButton/WebsiteLinkButton.tsx` + `.module.css`. Renders `null` when `url` prop is falsy — callers don't need their own conditional.

Props: `{ url: string | null | undefined; variant?: "full" | "compact" }` (default `"full"`).

Icon: Lucide `ExternalLink`, 2px stroke (matches the rest of the icon set already in use).

**`full` variant** — used in card/detail surfaces with room for a label (trip schedule cards, Explore detail panel, attraction picker rows, AttractionDetailModal):
- Element: `<a>` styled as a pill button, `target="_blank"`, `rel="noopener noreferrer"`.
- Shape: `border-radius: var(--radius-full)`, `padding: 6px 14px 6px 12px`, `gap: 6px` between icon and label.
- Rendered height ~34px visually, but add `padding-block` so the actual hit area is ≥44px OR wrap in a parent with `min-height: 44px; display: flex; align-items: center` — pick whichever fits the surrounding layout without adding visual bulk (44px touch target is a hard accessibility requirement even though the pill looks smaller).
- Border: `1px solid var(--color-primary)`. Background: `var(--color-surface)`. Text/icon color: `var(--color-primary)`.
- Label: "Website", `font-size: 13px`, `font-weight: 600`.
- Hover: `background: var(--color-primary-light)`, icon/text stay `var(--color-primary)`.
- Focus-visible: `outline: 2px solid var(--color-primary); outline-offset: 2px` (never remove focus rings).
- Active/press: `transform: scale(0.97)` — stays within transform/opacity only, no layout shift.
- Transition: `all var(--duration-fast) var(--easing-out)` per the system's standard interactive-element rule.

**`compact` variant** — used anywhere space is tight (map marker popups, dense list rows):
- Same visual language as the existing Carousel prev/next arrow buttons (`docs/DESIGN_SYSTEM.md` → Carousel) for free consistency: 32×32px circle, `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `box-shadow: var(--shadow-md)`, `border-radius: var(--radius-full)`.
- Icon only, 16px, `color: var(--color-primary)`, centered.
- Hover swaps to `background: var(--color-primary-light)`, `border-color: var(--color-primary)` — exact same hover swap the Carousel arrows already use.
- No visible label — must carry `aria-label="Visit official website"` (icon-only buttons require an aria-label per the project's own a11y rule) and a native `title="Visit official website"` for mouse-hover tooltip.
- Same focus-visible ring and press-scale as the full variant.

### Placement per surface (audit + wire up during implementation)
- **Trip schedule attraction cards** (`CalendarSection.tsx` and any other card rendering an `Attraction`): `full` variant in the card's existing action/meta row, after the type/duration info — don't let it push the card height up if avoidable, use flex-wrap if the row is already tight.
- **Explore attraction detail panel / marker popup**: `compact` variant next to any existing marker actions if the popup is small; `full` variant if the detail panel has its own dedicated action row (mirror however edit/delete or similar actions are already surfaced there).
- **Attraction picker rows** (`AttractionPickerModal` and similar list rows): `compact` variant at the row's trailing edge, consistent with any existing trailing icon-buttons in that row.
- **AttractionDetailModal** (or equivalent full detail view): `full` variant, placed near the top with the other key facts (price/hours), since this is the highest-intent surface for "I want to go to their site."
- General rule: never introduce a second visual language for this action — every instance is either the `full` or `compact` variant of the same component, styled only through the shared CSS module.

### Form input (new-attraction modal, edit/detail modal, residence modal if applicable)
- Standard text input, following the existing form-field pattern already used for other optional attraction fields (visible label "Website (optional)", not placeholder-only, per the project's existing form conventions).
- `type="url"` on the input for correct mobile keyboard + baseline browser validation.
- Inline validation on blur (not on every keystroke): if non-empty and not a well-formed URL, show an error message directly below the field using `--color-error`, don't block typing.
- Field is optional everywhere; clearing it back to empty is always allowed (no confirmation dialog needed for clearing a non-destructive text field).

## Revision (post-review feedback)
User asked for two changes: (1) re-run the backfill for the batches that failed on the session limit, (2) move the detail-modal button into the header and make it icon-only.
- `WebsiteLinkButton` gained an optional `className` prop so a specific surface can adjust sizing without forking the component.
- `AttractionDetailModal.tsx`: button moved from its own body row (between type chips and the location map) into `.headerActions`, before the visited-toggle/close buttons — `compact` variant, with a `.websiteBtn` override in `AttractionDetailModal.module.css` that aligns it to the header's existing 36px icon-button family (was 32px + shadow by default). The "help text" is the compact variant's existing `title`/`aria-label="Visit official website"`, which was already built in.
- Backfill re-run for Germany (234 remaining) + the failed Iceland batch is in progress (see below).

## Implementation Notes

- **Files created:**
  - `src/components/WebsiteLinkButton/WebsiteLinkButton.tsx`, `.module.css`, `.types.ts`, `index.ts` — the shared button, `full`/`compact` variants per the Design Brief.
  - `src/lib/url.ts` — `isValidUrl()`, shared blur-validation helper (empty is valid, non-empty must parse as a URL).
  - `scripts/backfill-website-urls.mjs` — throwaway backfill script (kept in `scripts/`, gitignored like the rest of that folder), reads `Name|URL` pairs and does a collation-aware `updateOne` by name.

- **Files modified:**
  - `src/models/Attraction.ts` — `websiteUrl?: string` on schema + `IAttraction` + `formatAttraction()`.
  - `src/types/attraction.ts` — `websiteUrl?: string` on the shared `Attraction` type.
  - `src/components/NewAttractionModal/attraction.types.ts` + `NewAttractionModal.tsx` — form field, state, blur validation, save/reset wiring.
  - `src/components/AddResidenceModal/AddResidenceModal.types.ts` + `AddResidenceModal.tsx` — same, on `ResidenceFormData`/`ResidenceInitialData` (residences do carry a website — e.g. a hotel's own booking page).
  - `src/lib/services/attractions.service.ts` — `websiteUrl` threaded through `createAttraction`, `updateAttraction`, and `addAttractionToTrip`'s new-attraction branch.
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` — `full` variant button, placed as its own row between the type chips and the location map (a "key fact," per the brief).
  - `src/app/trips/[id]/TripDetailClient.tsx` — `attractionToFormData`, `handleAttractionSave`, `handleResidenceUpdate`, `residenceInitialData` all now carry `websiteUrl`; `compact` variant button added to the attraction list row's existing `.rowActions` div.
  - `src/app/explore/ExploreClient.tsx` — its local `attractionToFormData` mirror updated the same way.
  - `src/components/index.ts`, `src/lib/index.ts` — barrel exports for `WebsiteLinkButton` and `isValidUrl`.
  - `swagger.yaml` — `websiteUrl` added to the Attraction schema, next to `photoUrl`.

- **Card-surface audit — where the button actually landed, and why not everywhere:**
  - **AttractionDetailModal** (full variant) turned out to be the *only* place that needed the button directly. Both the trip schedule calendar grid (`CalendarSection.tsx`) and Explore's map markers already route every click through this same shared modal (`viewingAttraction` / `selectedAttraction` state) rather than rendering their own detail view — confirmed by reading both files before touching anything. Cramming a pill button into CalendarSection's ~28px-tall compact schedule blocks would have visually broken that dense grid for no reason, since the detail modal is one click away either way.
  - **TripDetailClient.tsx's main attraction list** (compact variant) — a second real surface, added to the existing `.rowActions` div alongside the visited/edit/remove icon-buttons.
  - **AttractionPickerModal skipped deliberately**: its entire list row is itself a `<button>` (the whole row is the click target for selecting an attraction). Nesting another interactive `<a>`/button inside would be invalid HTML (interactive elements can't nest) and would break the row's click semantics — this isn't a matter of taste, it's a real markup rule. Flagging this now rather than restructuring that row's semantics, which is out of proportion for this task.

- **Deviations from brief:** the two above (routing through the shared detail modal instead of duplicating the button on every card; skipping the picker row) are the only deviations, both for concrete technical reasons rather than convenience — noted rather than silently done.
- **New design tokens used:** none — `WebsiteLinkButton.module.css` only references existing tokens already in `globals.css`/`docs/DESIGN_SYSTEM.md`.

- **Backfill results:** researched via 16 parallel background agents (split by country, ~35 attractions per batch), each instructed to only report a URL when confident it was the venue's real official site and to skip silently otherwise (never guess). Applied via `scripts/backfill-website-urls.mjs`.
  - **128 of 523 attractions backfilled** (24%). Breakdown: Hungary 41/65, United Kingdom 58/79, Georgia 8/39, Iceland 11/77, Italy 8/27, **Germany 2/236**.
  - **This is incomplete, not a finished pass** — mid-run, the session hit a hard account-level API limit ("You've hit your session limit · resets 10pm Asia/Jerusalem"), which failed 5 of 6 Germany batches outright and one Iceland batch (separately, to a mid-stream API error). Germany in particular is barely covered (2/236) purely because the limit landed while its batches were running, not because those venues lack real websites.
  - 66 attractions were pre-filtered out of the research pool entirely (free/natural landmarks, waterfalls, generic chain-branch entries like "Tesco Express" — categories that plausibly have no meaningful "official site" of their own) — these were never researched and are expected to stay unset.
  - **Follow-up needed**: re-run the same batching approach for Germany and the missed Iceland batch once the session limit resets, using the same `scripts/_filter-backfill.mjs` (recreate from this note if deleted) → parallel-agent-research → `scripts/backfill-website-urls.mjs` pipeline.
