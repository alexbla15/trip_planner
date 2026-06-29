# Task: New Attraction Form

Status: reviewing

Track: A
Track reason: new modal UI surface with Google Maps picker, multi-select type chips, and opening hours grid — none of these patterns exist in the design system yet

## Problem
Travelers need a way to define individual attractions (restaurants, bars, museums, etc.) with rich details — location, type, hours, pricing — so they can build meaningful trip itineraries. Currently there is no way to create or manage attractions in the app.

## Goal
A modal form that lets a user define a new attraction with all its key fields, accessible from two entry points: the top navbar and the future "Add Trip → Add Attraction" flow.

## Requirements

### Functional
- **Name** — text input, required
- **Country** — searchable select or autocomplete, required
- **Coordinates** — Google Maps embedded picker: user clicks a point on the map to set lat/lng; selected coordinates display below the map as read-only text
- **Type of attraction** — multi-select chip group (toggle on/off); options: Restaurant, Bar, Café, Museum, Gallery, Park, Beach, Landmark, Shopping, Nightclub, Theatre, Spa. At least one required.
- **Duration** — number input + unit selector (minutes / hours); e.g. "2 hours"
- **Price** — currency + amount input, or a simple tier selector (Free / $ / $$ / $$$)
- **Opening hours** — per-day grid: Mon–Sun rows, each with an open/close time input pair, plus a "Closed" toggle per day
- **Submit** — "Save Attraction" primary button; form validates required fields before submit
- **Cancel / close** — X button top-right; closes without saving

### Entry points
1. **Top navbar** — an "Add Attraction" action (button or dropdown item alongside "New Trip")
2. **Add Trip flow** — an "Add Attraction" button within the trip creation flow (exact wiring deferred to the Add Trip task; this task only needs the modal to be invokable programmatically via an `isOpen` prop)

### Non-functional
- Modal overlays the current page (not a route change)
- Responsive: full-screen on mobile, centered max-width 640px on desktop
- Accessible: focus trap inside modal, ESC closes, ARIA labels on all inputs
- Google Maps: use `@react-google-maps/api` or equivalent; API key read from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` env var

## Constraints
- CSS Modules only — no Tailwind, no component library
- No inline styles (per design system anti-patterns)
- Google Maps API key must be provided by the user via `.env.local`; if missing, show a placeholder with map coordinates text inputs as fallback
- Data is not persisted to a backend in this task — `onSave(attraction)` callback prop is sufficient

## Out of scope
- Full "Add Trip" flow and wiring
- Backend / API persistence
- Editing an existing attraction
- Attraction list or management UI
- Google Places autocomplete for the name field (nice-to-have, deferred)

---

## Design Brief

### Component structure
```
NewAttractionModal/
  NewAttractionModal.tsx      ← modal shell + form state
  NewAttractionModal.module.css
  AttractionTypeChip.tsx      ← single toggleable chip
  AttractionTypeChip.module.css
  OpeningHoursGrid.tsx        ← Mon–Sun rows
  OpeningHoursGrid.module.css
  MapPicker.tsx               ← Google Maps embed + fallback
  MapPicker.module.css
  attraction.types.ts         ← shared TypeScript types
```

---

### Modal shell

**Backdrop**
- `position: fixed; inset: 0`
- `background: rgba(15, 23, 42, 0.6)` (slate-900 at 60% — strong enough to isolate the form from the page)
- `z-index: 200` (above the navbar's z-index: 100)
- Fades in: `opacity 0 → 1`, `200ms ease-out`
- Click outside → closes modal

**Container (desktop ≥640px)**
- `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`
- `width: min(640px, calc(100vw - 48px))`
- `max-height: 90dvh`
- `overflow-y: auto`
- `background: var(--color-surface)`
- `border-radius: var(--radius-xl)` (24px, all corners)
- `box-shadow: var(--shadow-xl)`
- `z-index: 201`
- Enter animation: `scale(0.96) opacity(0) → scale(1) opacity(1)`, `200ms ease-out`
- Exit: reverse, `150ms ease-in`

**Container (mobile <640px)**
- `position: fixed; bottom: 0; left: 0; right: 0`
- `max-height: 96dvh`
- `border-radius: var(--radius-xl) var(--radius-xl) 0 0` (round top only)
- Enter: slide up from 100% translateY, `250ms ease-out`

**Modal header (sticky)**
- `position: sticky; top: 0`
- `background: var(--color-surface)`
- `padding: 20px 24px 16px`
- `border-bottom: 1px solid var(--color-border-subtle)`
- `z-index: 1`
- Left: `"New Attraction"` heading — `--text-xl`, weight 700, `--color-text-primary`
- Right: close button — Lucide `X` icon, 20px, 44×44px touch target, `--radius-md`, ghost style

**Modal footer (sticky)**
- `position: sticky; bottom: 0`
- `background: var(--color-surface)`
- `padding: 16px 24px`
- `border-top: 1px solid var(--color-border-subtle)`
- Layout: two buttons, right-aligned on desktop, full-width stacked on mobile
- "Cancel" — ghost button: `height: 44px; padding: 0 20px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 14px; font-weight: 600; color: var(--color-text-secondary); background: transparent`
- "Save Attraction" — primary button: same as design system Primary Button pattern; disabled+opacity-50 until all required fields are valid; shows Lucide `Loader2` spinning icon during submission

---

### Form body

`padding: 24px`; sections separated by `32px` vertical gap; each section has a section label + field(s).

**Base input style (reused across text/number/time/select)**
```
height: 44px
padding: 0 12px
border: 1px solid var(--color-border)
border-radius: var(--radius-md)
background: var(--color-surface)
font-size: 14px
color: var(--color-text-primary)
width: 100%
transition: border-color 150ms ease-out, box-shadow 150ms ease-out
```
Focus ring: `border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light)`

**Field label style**
```
font-size: 14px
font-weight: 500
color: var(--color-text-secondary)
margin-bottom: 6px
display: block
```
Required fields: append `" *"` in `--color-error` to the label text.

**Error message style**
```
font-size: 12px
color: var(--color-error)
margin-top: 4px
display: flex
align-items: center
gap: 4px
```
Lucide `AlertCircle` icon, 12px, inline before text.

---

### Fields

**1 — Attraction name** (full width)
- `<label>` "Attraction name *" + `<input type="text" placeholder="e.g. Louvre Museum">`
- Required, validate on blur

**2 — Country** (full width)
Render as a native `<select>` with all world countries as `<option>` values, styled to match the base input. Add a Lucide `ChevronDown` icon overlaid at the right edge (pointer-events: none) to replace the native arrow.
- Required, validate on blur

**3 — Type of attraction** (full width)
Section label: "Type *" (required — at least one must be selected)

Chip group: `display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px`

Types: Restaurant · Bar · Café · Museum · Gallery · Park · Beach · Landmark · Shopping · Nightclub · Theatre · Spa

Each chip (`<button type="button" role="checkbox" aria-checked={selected}>`):
```
Unselected:
  height: 32px
  padding: 0 14px
  border-radius: var(--radius-full)
  border: 1px solid var(--color-border)
  background: var(--color-bg-subtle)
  font-size: 13px
  font-weight: 500
  color: var(--color-text-secondary)
  cursor: pointer
  transition: all 150ms ease-out

Selected:
  border-color: var(--color-primary)
  background: var(--color-primary-light)
  color: var(--color-primary)
  font-weight: 600
```

**4 — Location (Google Maps picker)** (full width)
Section label: Lucide `MapPin` icon (14px, inline) + " Location"

*Map container:*
```
width: 100%
height: 220px
border-radius: var(--radius-md)
border: 1px solid var(--color-border)
overflow: hidden
background: var(--color-bg-subtle)
```
Use `@react-google-maps/api` `GoogleMap` + `Marker`. On map click, drop marker and update lat/lng state.

*Coordinates readout* (shown once coordinates are set, below map):
```
display: inline-flex
gap: 8px
padding: 6px 12px
border-radius: var(--radius-full)
background: var(--color-bg-subtle)
border: 1px solid var(--color-border-subtle)
font-size: 12px
color: var(--color-text-secondary)
font-family: monospace
margin-top: 8px
```
Text: `Lat: 48.8566  Lng: 2.3522`

*Fallback (no API key):*
Replace map container with a `--color-bg-subtle` rectangle, same dimensions, showing a centered Lucide `MapPin` icon (32px, `--color-text-tertiary`) and helper text "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local to enable the map" (`--text-xs`, `--color-text-tertiary`). Below it, show two side-by-side text inputs: "Latitude" and "Longitude" (each 50% width, 8px gap).

**5 — Duration** (partial width)
Section label: "Duration"
Row: `display: flex; gap: 8px; align-items: center`
- Number input: `width: 80px; height: 44px` (base input style)
- Unit `<select>`: `width: 110px; height: 44px` (base input style + ChevronDown icon overlay)
  Options: `minutes` · `hours`

**6 — Price** (partial width)
Section label: "Price"

Segmented control: `display: flex; max-width: 280px`
- Container: `border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; height: 44px`
- 4 segments (Free / $ / $$ / $$$), each `flex: 1`
- Inner borders between segments: `border-right: 1px solid var(--color-border)` (last segment: no right border)
- Unselected: `background: var(--color-surface); color: var(--color-text-secondary); font-size: 14px; font-weight: 500`
- Selected: `background: var(--color-primary); color: var(--color-text-inverse); font-weight: 600`
- Transition: `background 150ms ease-out, color 150ms ease-out`
- Each segment is `<button type="button">` with `aria-pressed={selected}`

**7 — Opening hours grid** (full width)
Section label: Lucide `Clock` icon (14px, inline) + " Opening Hours"

Grid: `display: grid; grid-template-columns: 44px 1fr; gap: 6px`

Each row = one day:
```
Day label   [Mon]    — 40px, font-size 13px, font-weight 600, color: --color-text-primary
"Closed" toggle checkbox — custom pill toggle (see below)
[Open time input]  –  [Close time input]
```

Actual row layout: `display: flex; align-items: center; gap: 10px; padding: 6px 0`
Alternate rows: odd rows get `background: var(--color-bg-subtle); border-radius: var(--radius-sm); padding: 6px 8px`

**Closed toggle** (per row):
- Visually: pill toggle (28×16px), `border-radius: var(--radius-full)`
- Off state: `background: var(--color-border)` with white circle on left
- On (Closed) state: `background: var(--color-error)` with white circle on right
- When "Closed" is ON: the time inputs get `opacity: 0.38; pointer-events: none`
- Transition: `150ms ease-out`
- Label text: "Closed" beside the toggle, `font-size: 12px; color: --color-text-tertiary`

Time inputs: `<input type="time">`, `height: 36px; width: 100px; font-size: 13px` (base input style, smaller height)
Separator: "–" text, `color: --color-text-tertiary; font-size: 14px`

---

### Navbar — "Add Attraction" entry point

Add to `Navbar.tsx`, inside `.actions` div, **between** the ThemeToggle and the "New Trip" button.

Ghost button (desktop only, hidden on mobile same as "New Trip"):
```
display: none → flex at ≥768px
align-items: center
gap: 6px
padding: 0 14px
height: 40px
min-height: 44px
border-radius: var(--radius-md)
border: 1px solid var(--color-border)
background: transparent
color: var(--color-text-secondary)
font-size: 14px
font-weight: 600
cursor: pointer
transition: border-color 150ms ease-out, color 150ms ease-out, background 150ms ease-out
```
Icon: Lucide `MapPin`, 15px
Label: "Add Attraction"
Hover: `border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-light)`

Also add to mobile menu (`.mobileMenu`): an `<a>` or `<button>` styled like `.mobileNavLink` with `MapPin` icon + "Add Attraction" text, positioned above the "New Trip" button.

On click: sets `attractionModalOpen = true` state in `Navbar.tsx` → renders `<NewAttractionModal isOpen={attractionModalOpen} onClose={...} onSave={...} />`

---

### Accessibility
- Focus trap inside modal (Tab/Shift+Tab cycle within modal only while open)
- ESC key → closes modal
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing to heading id
- All inputs have `<label htmlFor>` associations
- Chip buttons: `role="checkbox" aria-checked`
- Price segments: `aria-pressed`
- Closed toggles: `role="switch" aria-checked`
- On modal open: focus moves to the first input (Attraction name)
- On modal close: focus returns to the trigger button

## Implementation Notes
- Files created: `src/components/NewAttractionModal/attraction.types.ts`, `attraction.constants.ts`, `AttractionTypeChip.tsx`, `AttractionTypeChip.module.css`, `MapPicker.tsx`, `MapPicker.module.css`, `OpeningHoursGrid.tsx`, `OpeningHoursGrid.module.css`, `NewAttractionModal.tsx`, `NewAttractionModal.module.css`
- Files modified: `src/components/Navbar/Navbar.tsx`, `src/components/Navbar/Navbar.module.css`, `src/components/index.ts`
- Package installed: `@react-google-maps/api` (with `--legacy-peer-deps` for React 19 compatibility)
- Deviations from brief: Toggle thumb movement uses CSS `transform: translateX` on the `.toggleOn .toggleThumb` selector (no JS needed). Mobile button in menu uses `<button>` styled as `.mobileNavLink` rather than `<a>` since it triggers a modal rather than navigating. `Save Attraction` button disabled state applies when required fields are touched-and-invalid rather than just any invalid state, to avoid disabling the button on first render before any interaction.
- New design tokens used: none — all values from existing `docs/DESIGN_SYSTEM.md` token set
