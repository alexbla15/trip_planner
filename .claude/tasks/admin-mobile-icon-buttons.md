# Task: Icon-Only Add Buttons on /admin (Mobile)

Status: done

Track: B
Track reason: Small responsive tweak to existing buttons (hide text label below a breakpoint) — no new component, no new visual pattern, uses the icon already rendered.

## Problem
`/admin` (`src/app/admin/AdminClient.tsx`) doesn't look good on mobile. The three "Add" buttons ("Add category", "Add type", "Add mood") are fixed-height, icon+text buttons (`.addBtn` in `AdminClient.module.css`, lines 43–59) with no responsive rules — on narrow screens the text labels make them cramped/crowd the layout.

## Goal
On mobile viewports, the Add buttons show only their icon (already-rendered `Plus` icon from `lucide-react`) — compact and unobtrusive — while desktop keeps the icon + text label as-is.

## Requirements
- Below a mobile breakpoint (match whatever breakpoint convention `docs/DESIGN_SYSTEM.md` / existing CSS modules already use), hide the text label on all three `.addBtn` buttons in `AdminClient.tsx`, showing only the `Plus` icon
- Preserve accessibility: when the text label is visually hidden, the button must still have an accessible name (e.g. `aria-label="Add category"` on the button, keep visually-hidden text via a screen-reader-only span, or similar) — icon-only buttons must not lose their label for assistive tech
- Adjust button sizing/padding on mobile so it reads as a clean icon button (square-ish tap target, not a wide button with hidden text leaving dead space)
- Desktop/tablet layout is unchanged

## Constraints
- CSS Modules only — modify `AdminClient.module.css`, don't introduce new components
- Reuse the existing `Plus` icon already imported from `lucide-react` — no new icon
- Match spacing/breakpoint tokens already defined in `docs/DESIGN_SYSTEM.md`

## Out of scope
- Redesigning the rest of the `/admin` page layout for mobile (categories/types/mood lists) — only the Add buttons are in scope
- Changing button behavior/click handlers

## Implementation Notes
- Files created/modified: `src/app/admin/AdminClient.tsx`, `src/app/admin/AdminClient.module.css`
- Deviations from task requirements: the brief mentioned "three Add buttons," but `.addBtn` is actually used on five buttons ("Add category", "Migrate legacy (N)", "Add type", "Add mood", "Seed defaults"). Applied the icon-only-on-mobile treatment to all five for visual consistency — leaving two full-text and three icon-only on the same row would look worse, not better. Each button keeps its full label as an `aria-label` (including the dynamic count for "Migrate legacy (N)") so no information is lost for assistive tech at any viewport.
- New design tokens used: none — reused the existing `docs/DESIGN_SYSTEM.md` mobile breakpoint (`max-width: 639px`, matching the documented `sm: 640px` boundary) and the already-imported `Plus`/`RefreshCw` icons
- `tsc --noEmit` clean after the change

## Completion Summary
Add buttons on `/admin` (and the same-styled Migrate legacy / Seed defaults buttons) now show icon-only below 640px, full icon+text above it, with `aria-label`s preserving accessible names at every size. Confirmed by user. Closed 2026-07-27.
