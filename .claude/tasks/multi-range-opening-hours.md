# Task: Support multiple opening-hours ranges per day

Status: designing
Track: A
Track reason: new repeatable add/remove row interaction in the opening-hours form — not an existing pattern in the design system

## Problem
An attraction's opening hours currently support only a single `{open, close}` pair per weekday (`OpeningHoursDay` in `src/types/attraction.ts` and the duplicate form-side type in `src/components/NewAttractionModal/attraction.types.ts`). Many real venues have split hours in a single day (e.g. a restaurant open 10:00–12:00 and again 13:00–15:00 for lunch, closed in between). There's currently no way to represent or enter this, and `OpeningHoursGrid.tsx` renders exactly one open/close input pair per day with no "add another range" control.

## Goal
A venue's hours for a given day can hold one or more open/close ranges, editable in the New Attraction form and correctly evaluated by the closed-alert check.

## Requirements
- Change `OpeningHoursDay` (both `src/types/attraction.ts` and `src/components/NewAttractionModal/attraction.types.ts`) to hold a list of ranges instead of a single `{open, close}` pair (e.g. `{ closed: boolean; ranges: { open: string; close: string }[] }`), keeping the `closed` flag as-is.
- Update `DEFAULT_OPENING_HOURS` (`attraction.constants.ts`) and `buildInitialHours` (`src/lib/openingHours.ts`) for the new shape.
- `OpeningHoursGrid.tsx` (`DayRow`) gets an "add range" affordance per day (button to add another open/close pair) and a way to remove an added range; the first range remains required whenever the day isn't marked closed.
- `getClosedAlert` (`CalendarSection.utils.ts`) is updated to check the planned time against all of the day's ranges — closed alert only fires if the planned time doesn't fall in ANY range. Build this on top of [[opening-hours-midnight-wraparound-fix]]'s wraparound-safe comparison, applied per range.
- Existing single-range data in the DB (documents with the old shape) must not crash the app — plan a migration or backward-compatible read (e.g. a normalization step when loading hours) since this is a live app with existing attractions.

## Constraints
- Reuse the existing per-day row layout/spacing from `OpeningHoursGrid.tsx`; only the "multiple ranges" interaction is new.
- Keep the 24h/`is24h` shortcut path (`NewAttractionModal.tsx` line ~458) working unchanged — ranges only apply to the non-24h path.

## Out of scope
- A dedicated read-only "view hours" display component (none currently exists in the codebase; not required here unless trivial).
- Editing hours from anywhere other than `NewAttractionModal`.

## Design Brief

This project is a Next.js web app using CSS Modules (not React Native) — apply the general UI/UX principles below within that stack, ignoring any React Native-specific guidance.

**Current structure to extend** (`src/components/NewAttractionModal/OpeningHoursGrid.tsx` + `.module.css`): each day is one flex row — day label (36px), a closed-toggle switch, then a `.timeInputs` group holding two `<input type="time">` separated by a "–" dash. Row background alternates via `.rowOdd` (`var(--color-bg-subtle)`) for zebra striping. Tokens already in use: `--color-border`, `--color-primary`, `--color-primary-light`, `--color-text-primary/tertiary/inverse`, `--color-surface`, `--color-error`, `--radius-sm/md/full`, `--duration-fast`, `--easing-out`. Icon set is `lucide-react`, already imported in `NewAttractionModal.tsx` (`Plus`, `X` not yet imported there but both exist in the lucide set and are used as the semantic add/remove icons elsewhere in the design system per `docs/DESIGN_SYSTEM.md`).

**Layout change:**
- Each day's `.timeInputs` becomes a **vertical stack of range rows** instead of a single row, so multi-range days grow downward without breaking the day-label/toggle alignment on the left. Each range row keeps the existing `open input – dash – close input` pattern.
- Below the last range row (or beside the single range row when there's only one), add a small icon-only "add range" button: `Plus` icon, 20×20px, `--color-primary` on hover/default text color `--color-text-tertiary`, no visible border — ghost/icon-button style consistent with the toggle's minimal footprint. `aria-label="Add another opening-hours range for {day}"`. Hidden/disabled when the day is `closed`.
- Each range row **after the first** gets a small `X` icon-button (16×16px, `--color-text-tertiary`, hover `--color-error`) to remove that specific range. `aria-label="Remove this opening-hours range for {day}"`. The first range has no remove control (a day with hours always has at least one range — toggling `closed` is how you remove all hours).
- Keep the row's zebra background and 6px/8px padding; the added rows increase row height but should keep the same 6px vertical gap between stacked range rows as currently exists at `.grid { gap: 2px }` between day rows — use a slightly tighter `4px` gap between range rows within a day so the two levels of grouping (day vs. range) stay visually distinct.
- Both new icon buttons must hit the ≥24×24px minimum comfortable click target (icon-only buttons on desktop; pad the hit area with padding rather than enlarging the icon itself) and have visible `:focus-visible` outlines matching the existing `.toggle:focus-visible` pattern (`2px solid var(--color-primary)`, `outline-offset: 2px`).
- No new colors, radii, or durations — reuse the tokens listed above exactly.
- Respect `prefers-reduced-motion` implicitly by keeping any add/remove transition to the existing `--duration-fast` opacity/transform pattern already used for `.toggleThumb`/`.timeInputs` — no new animation choreography needed for a simple list add/remove.

**Data model reminder for implementation:** `OpeningHoursDay` becomes `{ closed: boolean; ranges: { open: string; close: string }[] }`. The component's local edit handlers (`handleTimeChange`) need an added `rangeIndex` parameter; `handleClosedToggle` stays as-is.
