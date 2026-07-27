# Task: Icon-Only Add Buttons on /admin (Mobile)

Status: intake

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
