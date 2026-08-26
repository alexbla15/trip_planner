# Task: Opening months (seasonal availability) on attractions

Status: done
Track: A
Track reason: New data model field plus a new form UI (month selector) with no existing equivalent pattern in the design system — needs a design pass before implementation.

## Problem
Attractions currently only model weekly opening hours (`openingHours`, Mon–Sun). Some attractions (seasonal markets, ski resorts, certain parks) are only open certain months of the year. There's no way to record this, and trips scheduled for an attraction outside its actual open season get no warning.

## Goal
An attraction can optionally specify which months of the year it's open (defaulting to all 12 / year-round when not specified), and a trip's schedule view warns when an attraction is scheduled for a date outside its open months.

## Requirements
- New `openingMonths` field on the Attraction data model — represent as e.g. a `number[]` of open months (1–12) or a 12-boolean map; default/absence means open all year. Update all three required locations per project convention: TypeScript interface in `src/types/`, TypeScript interface in `src/models/Attraction.ts`, and the Mongoose schema in the same file.
- Add a month-selector control to `src/components/NewAttractionModal/NewAttractionModal.tsx` (create + edit) — needs a Design Brief for the interaction pattern (e.g. a 12-cell toggle grid similar in spirit to the existing weekly `OpeningHoursGrid`, or a range picker). Default state on a new attraction: all months selected (year-round).
- In `src/app/trips/[id]/CalendarSection.utils.ts`'s `getClosedAlert()` (or a sibling function), add a check: if the attraction has `openingMonths` set to less than all 12 and the scheduled `plannedDate`'s month isn't included, produce a `ScheduleAlert` (same rendering path as the existing hours-closed alert, via `ScheduleAlertList.tsx`).
- An attraction with all 12 months open should behave exactly as today (no chip, no alert). [[consolidate-attraction-card-chips]] and [[permanently-closed-chip]] have both shipped since this task was written — the chip system is `getStatusChips(openingHours)` in `src/lib/attractionStatusChips.ts` (returns `StatusChipDescriptor[]` with `{ key, icon, label, tone? }`), consumed by `AttractionDetailModal.tsx` rendering inline in its Types/category chip row (`.chip`/`.statusChip`/`.statusChipDanger` CSS classes), with the "Opening Hours" heading/table skipped whenever `getStatusChips()` returns non-empty. This task should add a "Year-round" condition to that same `getStatusChips()` function (likely needs to accept `openingMonths` as a second argument, or a sibling function whose results get merged — read the current file before deciding) rather than building any new chip UI. Do **not** touch `AttractionGridCard.tsx` — established precedent is that the compact grid tile carries no chip/badge representation of status info at all.

## Constraints
- Per project learnings: adding a new Mongoose schema field requires restarting the dev server before it will persist — flag this to the user when manually verifying.
- Per project learnings on data-shape migrations: existing attractions in the DB have no `openingMonths` field. Reads must treat missing/undefined as "all year" (year-round default) rather than requiring a migration script, since the default is equivalent to "field absent."
- Grep every reader of the Attraction type/schema before assuming this is additive-only — check `formatAttraction` in `src/models/Attraction.ts` for any place that spreads/validates known fields explicitly.

## Out of scope
- Multi-range seasonal patterns (e.g. "open March–May and Sept–Nov" is fine to support via a simple month-set; no need for a separate "ranges" UI beyond a flat set of selected months).
- Retroactively backfilling existing attractions with real seasonal data — this task only adds the capability.

## Design Brief

The codebase already has two directly-reusable precedents for this exact UI shape — don't invent new visual language, mirror them:

1. **The "24/7" toggle next to the Opening Hours label** (`NewAttractionModal.tsx` ~line 506–524, `.labelRow`/`.labelWithIcon`/`.toggle24h`/`.toggle24hActive` in `NewAttractionModal.module.css`) — a section header with an icon+label on the left and a pill toggle on the right that shows/hides the detail grid below it.
2. **`AttractionTypeChip`** (`src/components/NewAttractionModal/AttractionTypeChip.tsx` + `.module.css`) — a `role="checkbox"` pill button with `.chip`/`.chipSelected` states (unselected: `var(--color-border)` border, `var(--color-bg-subtle)` bg, `var(--color-text-secondary)` text; selected: `var(--color-primary)` border, `var(--color-primary-light)` bg, `var(--color-primary)` text, weight 600), 32px tall, `--radius-full`.

**New section: "Opening Months"**, placed immediately after the existing "Opening Hours" `.field` block (after line ~524):

- Header row (reuse `.field` > `.labelRow` exactly): left side `.labelWithIcon` with a `Calendar` (lucide) icon + "Opening Months" label; right side a toggle pill styled identically to `.toggle24h`/`.toggle24hActive` (either reuse the class directly or duplicate it 1:1 — do not invent new toggle styling), labeled "Year-round".
- **Year-round ON (default for new attractions)**: the month grid is hidden — exact same show/hide relationship as `is24h`/`OpeningHoursGrid`.
- **Year-round OFF**: reveals a new `MonthsGrid` component (new file, sibling to `OpeningHoursGrid.tsx` in the same folder — `MonthsGrid.tsx` + `.module.css`), a `role="group" aria-label="Opening months"` wrapper containing 12 chips (Jan–Dec, 3-letter labels), each a `role="checkbox" aria-checked={selected}` button styled exactly like `AttractionTypeChip`'s `.chip`/`.chipSelected` (either import/reuse that component generically with a `label`/`selected`/`onToggle` prop shape, or duplicate its CSS 1:1 into `MonthsGrid.module.css` — prefer reusing the component if its props generalize cleanly without forcing type-specific icon logic in).
- Grid layout: `display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;` (4×3 on desktop), collapsing to `repeat(3, 1fr)` under the existing 480px breakpoint (match `OpeningHoursGrid.module.css`'s `@media (max-width: 480px)` pattern).
- Toggling "Year-round" OFF then back ON must NOT clear the previously selected months (same non-destructive precedent as [[hide-hour-pickers-when-day-closed]] — state is preserved, only the UI visibility toggles).
- No new color tokens, spacing values, or shadow styles — every value above already exists in `docs/DESIGN_SYSTEM.md`/the existing component CSS. This keeps the task on the fast track in spirit even though it's classified Track A only because the *component* (MonthsGrid) is new, not because any new design language is needed.

Handing off to `/developer` now — implement per the Requirements above plus this Design Brief, then invoke `/product` to report completion.

## Implementation Notes
- Files created/modified:
  - `src/types/attraction.ts`, `src/models/Attraction.ts` (`IAttraction` + Mongoose schema `openingMonths: [{ type: Number, min: 1, max: 12 }]` + `formatAttraction`) — additive `openingMonths?: number[]` field, following the exact three-location convention used for every other field.
  - `src/lib/services/attractions.service.ts` — `CreateAttractionInput`/`createAttraction`, `updateAttraction` (permissive body, explicit `if (body.openingMonths !== undefined)` line), and `AddAttractionToTripInput`/`addAttractionToTrip`'s "create new attraction" branch all thread `openingMonths` through. Grepped every writer of Attraction fields (not just `NewAttractionModal.tsx`'s direct save path) since `addAttractionToTrip` is a second, separate code path that creates brand-new Attraction documents (used when adding a new attraction directly from within a trip) — would have silently dropped the field otherwise.
  - `src/lib/openingMonths.ts` (new) — `ALL_MONTHS`, `isYearRound(openingMonths)` (absent/empty/all-12 → true), `formatOpeningMonthsLabel(openingMonths)` (e.g. "Mar–Oct" for a contiguous run, comma list otherwise).
  - `src/lib/attractionStatusChips.ts` — `getStatusChips` widened to `(openingHours, openingMonths?)`. Permanently-closed still short-circuits everything; 24/7 and a new "seasonal" chip are independent and can both apply.
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` — single call site updated to pass `attraction.openingMonths` through; no other changes needed (confirms the extensibility seam from [[consolidate-attraction-card-chips]] worked as designed).
  - `src/app/trips/[id]/CalendarSection.utils.ts` — new `getOutOfSeasonAlert()`, wired into `computeAlerts()` alongside the existing `getClosedAlert()`. Added `"season"` to the `AlertType` union (confirmed `ScheduleAlertList.tsx` renders generically off `id`/`message` and doesn't switch on `type`, so no rendering changes needed there).
  - `src/components/NewAttractionModal/attraction.types.ts`, `attraction.constants.ts` (`MONTH_LABELS`), `attraction.utils.ts` (`attractionToFormData` passthrough), `index.ts` (barrel) — form-side plumbing.
  - `src/components/NewAttractionModal/MonthsGrid.tsx` + `.module.css` (new) — 12-chip grid per the Design Brief, styled after `AttractionTypeChip`.
  - `src/components/NewAttractionModal/NewAttractionModal.tsx` — `openingMonths`/`yearRound` state, sync effect (edit mode), save payload (`yearRound ? undefined : openingMonths`), reset, and the new "Opening Months" section mirroring the "Opening Hours"/24-7 toggle exactly, per the Design Brief.
  - `swagger.yaml` — added `openingMonths` to both the `Attraction` response schema and the `AttractionInput` request schema (array of 1–12 integers, nullable).
- Deviations from brief: **the "Year-round" chip never renders.** The brief (and the original task requirement) said an attraction with all 12 months open should show "no chip" — but also called for a "Year-round" chip elsewhere. Those two statements are contradictory if taken literally (a chip literally named "Year-round" would only ever need to appear in the one state that's defined to show no chip). Resolved by showing a chip only for the *exception* — a genuine seasonal restriction — labeled with the actual open months (e.g. "Open Mar–Oct"), matching the same "chip = deviation from the default" pattern already established by "Permanently closed". This seemed like the only self-consistent reading; flagging it explicitly here per the brief's own instruction to document precedence/judgement calls.
- New design tokens used: none — `MonthsGrid` reuses `AttractionTypeChip`'s exact chip spec; the "Year-round" toggle reuses `.toggle24h`/`.toggle24hActive` styling as instructed.

**Manual verification note:** this adds a new Mongoose schema field — the dev server must be restarted before `openingMonths` will actually persist on save (existing project learnings on this exact pitfall). Please restart `next dev` before testing in the browser.

Verified with `npx tsc --noEmit` (clean) and `npx eslint` across all changed files (clean). Skipped a full `next build` verification pass since a `next dev` process was detected running — per project learnings, running a production build alongside a live dev server corrupts its route manifest, and a restart is needed anyway for the schema change to take effect.

## Post-review fixes
1. **Dev server had actually crashed** (not just a stale-schema issue): the user's save attempt failed with a generic "Couldn't update" error. Direct `curl` reproduction showed the real cause — `Error: Jest worker encountered 2 child process exceptions, exceeding retry limit`, a Next.js/Turbopack internal compiler-worker crash unrelated to any application code. Killed the two `trip_planner`-specific node processes (`next dev` + its `start-server.js` child, identified via `Get-CimInstance Win32_Process` command-line matching — left unrelated node processes for other projects untouched) and restarted `npm run dev`. Re-verified via direct API calls (login as demo user, create/update/delete a throwaway test attraction with `openingMonths` set) that the full save path now works and persists correctly.
2. **Separately, the user hit a real React hydration error** ("`<button>` cannot be a descendant of `<button>`") while browsing Explore during the same testing session — pre-existing, unrelated to this task's changes (confirmed via `git diff` that `AttractionGridCard.tsx` had no changes from this session before this fix). `AttractionGridCard.tsx`'s whole card was a `<button>` wrapping several action `<button>`s (edit/delete/add-to-trip) — invalid HTML. Fixed by converting the outer element to `<div role="button" tabIndex={0}>` with an `onKeyDown` handler for Enter/Space, matching the same accepted pattern already documented in `docs/LEARNINGS.md` for `AttractionPickerModal`'s equivalent case.

## Completion Summary
Attractions can now specify seasonal availability (`openingMonths`, defaulting to year-round) via a new "Opening Months" section in the edit form, mirroring the existing 24/7-hours toggle pattern. Trips scheduled outside an attraction's open season now get a schedule warning, and genuinely seasonal attractions show an "Open Mar–Oct"-style chip on their detail card (year-round attractions, the default, show nothing). Along the way, diagnosed and fixed a crashed dev server (Turbopack worker crash, unrelated to this task's code) that was blocking the user's testing, and fixed a pre-existing nested-`<button>` hydration bug on the Explore grid card the user also encountered while testing. Confirmed working by user on 2026-08-26.
