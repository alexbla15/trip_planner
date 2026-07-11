# Task: Searchable Icon Picker

Status: done

Track: A
Track reason: New visual component — icon grid with real-time search, no existing pattern in the design system

## Problem
The admin attraction-type form has two native `<select>` dropdowns (Type icon, Category icon) that list icon names as plain text strings. With ~40 icons, picking the right one means scanning a wall of names like "FerrisWheel" or "Clapperboard" with no visual preview. This is slow, error-prone, and unhelpful.

## Goal
Admins can type a few characters to filter a visual icon grid and select the correct icon in one fast, glanceable interaction.

## Requirements
- New `IconPicker` component:
  - Displays as a compact trigger showing the currently selected icon + a chevron
  - Clicking opens a dropdown panel containing:
    - A search/filter text input at the top
    - A grid of all available icons rendered as icon-only cells (no name labels visible)
    - Hovering a cell shows the icon name in a tooltip
    - The currently selected icon cell is highlighted
  - Typing in the search input filters the grid in real time (match on icon name, case-insensitive)
  - Clicking a cell selects that icon and closes the dropdown
  - Pressing Escape closes the dropdown without changing the selection
  - Blurring outside closes the dropdown without changing the selection
  - Keyboard accessible: arrow keys navigate cells, Enter selects
- Replaces both `<select>` elements in `src/app/admin/AdminClient.tsx` (lines ~136 and ~151)
- All icon-related utilities (`ICON_REGISTRY`, `ICON_NAMES`, `getIconComponent`, `renderTypeIcon`) are co-located in `src/components/IconPicker/` — `src/lib/attractionIcons.tsx` should re-export from there (or be replaced entirely by the component's utilities file) so existing callers don't break
- All icons currently in `ICON_REGISTRY` (Archive, Luggage, and all others — ~42 total) must be included

## Constraints
- CSS Modules only — no inline styles, no Tailwind
- No external libraries
- Props interface: `{ value: string; onChange: (name: string) => void }`
- Must fit inline in the admin form field row — trigger width should match the current select (~same compact footprint)
- Use existing design-system tokens only

## Out of scope
- Using this picker outside the admin panel for now
- Drag-to-reorder icons
- Adding or removing icons from the registry (done separately via `attractionIcons.tsx`)

## Design Brief

### Context

The admin attraction-type form at `src/app/admin/AdminClient.tsx` has two icon fields ("Type icon", "Category icon"). Each is currently a native `<select>` inside a `.selectWrap` (flex: 1, position: relative) with a preview square to its left. Replace the `<select>` + `.selectWrap` with `<IconPicker>` — drop-in, same outer footprint.

Props: `{ value: string; onChange: (name: string) => void }`

All icon utilities move to `src/components/IconPicker/iconPicker.utils.ts`. `src/lib/attractionIcons.tsx` becomes a thin re-export so existing callers (`AdminClient.tsx`, `AttractionTypeChip.tsx`, `TripDayMapWidget.tsx`, `NewAttractionModal.tsx`) continue to work without change.

---

### Layout — Closed (Trigger)

- Height: 44px, width: `100%` (flex: 1 from parent `.iconRow`)
- Background: `var(--color-surface)`, border: `1px solid var(--color-border)`, `border-radius: var(--radius-md)`
- Selected icon rendered at 18px, centered, color `var(--color-text-primary)`
- `ChevronDown` 13px, absolute right 10px, `var(--color-text-tertiary)`, pointer-events none
- Hover: border → `var(--color-text-tertiary)`; icon color unchanged
- Focus-visible: `outline: 2px solid var(--color-primary); outline-offset: 2px`
- Open state: border → `var(--color-primary)`, box-shadow: `0 0 0 3px var(--color-primary-light)`

---

### Layout — Open (Dropdown)

- Position: `absolute`, `top: calc(100% + 4px)`, `left: 0`
- Width: `240px` (wider than trigger — fixed)
- Background: `var(--color-surface)`, border: `1px solid var(--color-border)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-lg)`, `z-index: 100`
- Max-height: `240px` for the grid area, `overflow-y: auto`
- `role="dialog"`, `aria-label="Pick an icon"`

---

### Search Bar

- Padding: `8px 10px`, `border-bottom: 1px solid var(--color-border-subtle)`
- Input: height 28px, borderless inside panel, `background: var(--color-bg-subtle)`, `border-radius: var(--radius-sm)`, font 13px, `var(--color-text-secondary)`
- Left: `Search` icon 13px, `var(--color-text-tertiary)`, non-interactive
- Placeholder: "Search icons…" in `var(--color-text-tertiary)`
- Auto-focused when dropdown opens
- No outline on the input itself (panel already shows focus context from trigger)

---

### Icon Grid

- Padding: `8px`
- CSS grid: `grid-template-columns: repeat(6, 1fr)` — 6 columns
- Each cell: `36×36px`, `border-radius: var(--radius-sm)`, flex center, `cursor: pointer`
- Icon size inside cell: 16px
- States:
  - **Default**: icon `var(--color-text-tertiary)`, background transparent
  - **Hover**: background `var(--color-bg-subtle)`, icon `var(--color-text-primary)`
  - **Selected**: background `var(--color-primary-light)`, icon `var(--color-primary)`, `outline: 1.5px solid var(--color-primary)`, `outline-offset: -1px`
  - **Keyboard-highlighted**: background `var(--color-bg-subtle)`, icon `var(--color-text-primary)`, `outline: 2px solid var(--color-primary)`, `outline-offset: -1.5px`
- Tooltip: native `title={iconName}`
- `role="grid"`, each cell `role="gridcell"`, `aria-label={iconName}`, `aria-selected` on selected

---

### Empty State

When search returns 0 results: "No icons match" — 13px, `var(--color-text-tertiary)`, centered, `padding: 16px`

---

### Interaction Spec

| Event | Behavior |
|---|---|
| Click trigger | Opens dropdown, auto-focuses search input, shows all icons |
| Type in search | Filters grid in real time (icon name, case-insensitive) |
| Click icon cell | Selects icon, closes dropdown, returns focus to trigger |
| ArrowRight / ArrowLeft | Move highlight one cell right/left (wraps row) |
| ArrowDown / ArrowUp | Move highlight one row down/up (wraps grid) |
| Enter | Selects highlighted icon, closes dropdown |
| Escape | Closes dropdown, reverts to pre-open value, returns focus to trigger |
| Click outside | Closes dropdown, reverts to pre-open value |
| Tab in search input | Moves focus into the grid (first highlighted cell) |

---

### Animation

Dropdown: `opacity: 0 → 1` + `transform: translateY(-4px) → translateY(0)` over `var(--duration-fast)` `var(--easing-out)`. CSS `@keyframes` only — no JS animation.

---

### File Structure

```
src/components/IconPicker/
├── IconPicker.tsx             ← component
├── IconPicker.module.css      ← all styles
├── iconPicker.utils.ts        ← ICON_REGISTRY, ICON_NAMES, getIconComponent, renderTypeIcon
└── index.ts                   ← named exports: IconPicker + all utils
```

`src/lib/attractionIcons.tsx` → replace content with:
```tsx
export { ICON_REGISTRY, ICON_NAMES, getIconComponent, renderTypeIcon } from "@/components/IconPicker/iconPicker.utils";
```

---

### Wiring in AdminClient.tsx

Replace each `<div className={styles.selectWrap}>...</div>` block (lines ~135–141 and ~149–155) with:

```tsx
<IconPicker value={form.icon} onChange={(v) => set("icon", v)} />
<IconPicker value={form.categoryIcon} onChange={(v) => set("categoryIcon", v)} />
```

Remove `ChevronDown` from AdminClient imports only if it becomes unused after replacement.

---

### Accessibility

- Trigger: `<button type="button">`, `aria-expanded`, `aria-haspopup="true"`
- Search input: `aria-label="Search icons"`
- Each icon cell: `aria-label={iconName}`, `aria-selected="true"` when selected

## Completion Summary
Searchable icon picker implemented with visual grid, real-time search, keyboard navigation (arrows/Enter/Escape), and accessible attributes. Replaces both native `<select>` elements in AdminClient. Icon utilities moved to `src/components/IconPicker/`; `src/lib/attractionIcons.tsx` becomes a thin re-export. Closed 2026-07-11.

## Implementation Notes
- Files created/modified:
  - `src/components/IconPicker/iconPicker.utils.tsx` — ICON_REGISTRY, ICON_NAMES, getIconComponent, renderTypeIcon (moved from attractionIcons.tsx)
  - `src/components/IconPicker/IconPicker.tsx` — searchable icon picker component
  - `src/components/IconPicker/IconPicker.module.css` — all styles
  - `src/components/IconPicker/index.ts` — barrel: exports IconPicker + all utils
  - `src/lib/attractionIcons.tsx` — replaced with single re-export line from IconPicker utils
  - `src/components/index.ts` — added IconPicker + utils exports
  - `src/app/admin/AdminClient.tsx` — removed both icon `<select>` blocks + iconPreview spans + PreviewIcon/PreviewCatIcon constants; wired up two `<IconPicker>` instances; removed ICON_NAMES import
- Deviations from brief:
  - `iconPicker.utils.tsx` uses `.tsx` extension (not `.ts` as in brief) because `renderTypeIcon` returns JSX — requires TSX compilation. This is the only deviation.
  - Removed the `iconPreview` square spans from the two icon form fields in AdminClient — the IconPicker trigger already shows the selected icon, making the preview redundant.
- New design tokens used: none — all tokens already existed
