# Task: New Trip Page — General Details

Status: reviewing

Track: A
Track reason: new full-page route with a multi-section form layout, mood-tag multi-select, and date-range picker — no existing design-system pattern covers this surface

## Problem
Travelers can't yet start creating a trip in the app. The "New Trip" button in the navbar does nothing. There is no place to capture a trip's core metadata (name, destination, dates, budget, mood) before building an itinerary.

## Goal
A `/new-trip` route that renders a two-column details form, wires the navbar button to navigate to it, and prepares the page shell for the attraction picker (Task 2 of the New Trip Flow goal).

## Requirements

### Functional
- **Route:** `src/app/new-trip/page.tsx` — a new App Router page at `/new-trip`
- **Navbar wiring:** clicking "New Trip" navigates to `/new-trip` (use `next/link` or `useRouter`)
- **Form fields:**
  - Trip name — text input, required
  - Destination country — searchable select (reuse the COUNTRIES list from `attraction.constants.ts`)
  - Start date / End date — date inputs (type="date"), both required; end must be ≥ start
  - Duration — auto-calculated read-only field: "X days" derived from start/end dates
  - Total budget — number input + currency prefix ("$")
  - Mood / travel style — multi-select chip group using the existing 7 mood tags from the design system (`Hidden Gems`, `Instagrammable`, `Vibrant Nightlife`, `Cultural Heritage`, `Adventure`, `Beach Life`, `Food & Wine`)
  - Notes — textarea, optional, max 500 chars with char count indicator
- **Section 2 placeholder:** below the form, a clearly labelled empty-state panel "Your Attractions — Add your first attraction to start building your itinerary" with a prominent "Add Attraction" button that opens `NewAttractionModal`
- **Continue / Save button:** primary CTA "Continue to Attractions →" at the bottom of the form; validates required fields before enabling; for now just saves to local state (no routing to step 2 yet — that is Task 2)

### Non-functional
- Page title (document `<title>`): "New Trip – TripPlanner"
- Responsive: stacked single-column on mobile, two-column form grid on desktop (≥768px)
- Accessible: all inputs labelled, date range validated with descriptive error messages, focus management on error

## Constraints
- CSS Modules only — no Tailwind, no component library
- No inline styles
- Reuse `MoodTagChip` from `src/components/MoodTagChip/` for the mood selector
- Reuse `COUNTRIES` from `src/components/NewAttractionModal/attraction.constants.ts`
- Reuse `NewAttractionModal` for the "Add Attraction" button
- No backend — state is local (useState) for now
- The attraction list collected here will be passed to the picker in Task 2; design the state shape with that in mind

## Out of scope
- The three-view attraction picker (map/table/calendar) — that is Task 2
- Saving the trip to a database
- Trip editing / update flow
- Multi-step wizard progress indicator (can be added later)

---

## Design Brief

### Files
```
src/app/new-trip/
  page.tsx                   ← Server Component: metadata export + renders NewTripClient
  NewTripClient.tsx          ← "use client": all form state
  NewTripClient.module.css

src/components/MoodTagButton/
  MoodTagButton.tsx          ← interactive <button> wrapper with selected state
  MoodTagButton.module.css
```

---

### Navbar wiring
Replace the existing `<button className={styles.newTripBtn}>` in `Navbar.tsx` with `<Link href="/new-trip" className={styles.newTripBtn}>` (import `Link` from `next/link`). Do the same for the mobile menu `<button className={styles.mobileNewTripBtn}>`. `Link` renders as `<a>` — the existing CSS classes apply unchanged.

---

### Page layout

**Background:** `var(--color-bg-subtle)` — body default, no override needed.

**Outer container:**
```css
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  padding-bottom: 64px;
}
```

**Page header** (`padding: 40px 0 32px`):
- Back link: Lucide `ChevronLeft` 16px + "Dashboard" — `font-size: 14px; font-weight: 500; color: var(--color-text-secondary); text-decoration: none; display: inline-flex; align-items: center; gap: 4px` — links to `/`; hover: `color: var(--color-primary)`
- `<h1>` (12px gap below back link): Lucide `Plane` 22px (`color: var(--color-primary)`) + "Plan Your Trip" — `font-family: var(--font-plus-jakarta-sans); font-size: 30px; font-weight: 700; color: var(--color-text-primary); display: flex; align-items: center; gap: 10px`
- Subtitle (8px below h1): "Fill in the details, then add the places you want to visit." — `font-size: 16px; color: var(--color-text-secondary)`

**Two-column grid:**
```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: start;
}
@media (min-width: 768px) {
  .grid {
    grid-template-columns: 1fr 380px;
  }
}
```

---

### Left column — Form card

```css
.formCard {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
```

**Card section heading:**
```css
.sectionHeading {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  padding-bottom: 6px;
  border-bottom: 2px solid var(--color-primary-light);
  display: inline-block;
}
```
Text: "Trip Details"

**Shared field styles** (same as `NewAttractionModal`):
- `.field`: `display: flex; flex-direction: column; gap: 6px`
- `.label`: `font-size: 14px; font-weight: 500; color: var(--color-text-secondary); display: flex; align-items: center; gap: 6px`
- `.required`: `color: var(--color-error)`
- `.input` / `.select`: `height: 44px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); font-size: 14px; color: var(--color-text-primary); width: 100%; font-family: inherit`
- Focus: `border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); outline: none`
- `.inputError`: `border-color: var(--color-error)`
- `.errorMsg`: `font-size: 12px; color: var(--color-error); display: flex; align-items: center; gap: 4px` + Lucide `AlertCircle` 12px
- `.selectWrapper`: `position: relative` with Lucide `ChevronDown` 16px absolutely positioned right, pointer-events none

**Fields:**

**1 — Trip name** *(full width)*
- Label: Lucide `PenLine` 14px + "Trip name *"
- `<input type="text" id="trip-name" placeholder="e.g. Paris Summer Adventure" aria-required="true">`

**2 — Destination** *(full width)*
- Label: Lucide `Globe` 14px + "Destination *"
- Native `<select>` using COUNTRIES with empty first option "Select a country…" + ChevronDown overlay

**3 — Dates** *(full width label, two date pickers)*
- Label: Lucide `Calendar` 14px + "Dates *"
- Below label: two-input grid
```css
.dateRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 480px) {
  .dateRow { grid-template-columns: 1fr; }
}
```
Each cell: a sub-label `<span>` above the input ("Start" / "End" in `font-size: 12px; color: --color-text-tertiary; display: block; margin-bottom: 4px`) then `<input type="date">`. Error message below the row if end < start.

**4 — Duration pill** *(shown only when both dates are valid)*
- Not an input — rendered as a `<p>` or `<span>`:
```css
.durationPill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
  margin-top: 4px;
}
```
`aria-live="polite"` on the containing `<div>`; content: Lucide `Clock` 13px + "7 days"

**5 — Budget** *(full width)*
- Label: Lucide `DollarSign` 14px + "Budget"
- Currency row: `display: flex; align-items: stretch`
  - Prefix `<span>` "$": `display: flex; align-items: center; padding: 0 12px; background: var(--color-bg-subtle); border: 1px solid var(--color-border); border-right: none; border-radius: var(--radius-md) 0 0 var(--radius-md); font-size: 14px; color: var(--color-text-secondary); font-weight: 600`
  - Input: `flex: 1; border-radius: 0 var(--radius-md) var(--radius-md) 0; height: 44px` (base input style minus left radius)

**6 — Travel mood** *(full width)*
- Label: Lucide `Sparkles` 14px + "Travel mood *"
- Sub-label below (4px gap): "Select at least one" — `font-size: 12px; color: var(--color-text-tertiary)`
- Chip group: `display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px` + `role="group"` + `aria-labelledby="mood-label"`
- 7 `MoodTagButton` components (see below)

**7 — Notes** *(full width)*
- Label: Lucide `FileText` 14px + "Notes"
- `<textarea rows={4} maxLength={500} placeholder="Anything special about this trip…">`:
```css
.textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 14px;
  color: var(--color-text-primary);
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  line-height: 1.5;
}
```
- Character count below, right-aligned: `display: flex; justify-content: flex-end; font-size: 12px; color: var(--color-text-tertiary); margin-top: 4px; aria-live="polite" aria-atomic="true"` — "0 / 500"; turns `--color-warning` at ≥450, `--color-error` at 500

**CTA row** *(bottom of form card)*
```css
.ctaRow {
  display: flex;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid var(--color-border-subtle);
}
@media (max-width: 480px) {
  .ctaRow { justify-content: stretch; }
  .ctaRow > button { width: 100%; justify-content: center; }
}
```
- Button: primary style (from design system) with Lucide `ArrowRight` 15px **after** the text — "Continue to Attractions"
- `disabled` + `aria-disabled="true"` + `opacity: 0.5` when required fields invalid

---

### Right column — Attractions panel

```css
.attractionsCard {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
```

**Section heading** (same `.sectionHeading` class): "Your Attractions"

**Attraction count badge** (shown when attractions > 0):
```css
.countBadge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
}
```

**Empty state** (when no attractions added):
```css
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 16px;
  gap: 16px;
}
```
- Icon circle: `width: 72px; height: 72px; border-radius: var(--radius-full); background: var(--color-primary-light); display: flex; align-items: center; justify-content: center` + Lucide `Map` 32px, `color: var(--color-primary)`
- Heading: "No attractions yet" — `font-size: 16px; font-weight: 600; color: var(--color-text-primary)`
- Body: "Add the places you want to visit to start building your itinerary." — `font-size: 14px; color: var(--color-text-secondary); line-height: 1.6; max-width: 240px`
- CTA: primary button, Lucide `Plus` 15px + "Add Attraction" — `onClick` opens `NewAttractionModal`

**Attraction list item** (rendered per saved attraction):
```css
.attractionItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}
```
- Left icon circle (36×36px, `--radius-full`, `--color-primary-light` bg): first attraction type icon from `ICONS` map in `AttractionTypeChip`
- Middle: name `font-size: 14px; font-weight: 600` + types joined by comma `font-size: 12px; color: --color-text-tertiary`
- Right: remove button — Lucide `X` 14px ghost — `min-width: 32px; min-height: 32px; display: flex; align-items: center; justify-content: center; border: none; background: none; cursor: pointer; color: --color-text-tertiary; border-radius: --radius-md` — hover: `color: --color-error; background: var(--color-bg-subtle)`
- `aria-label="Remove <attraction name>"`

---

### MoodTagButton component

Props:
```ts
interface MoodTagButtonProps {
  tag: string;
  selected: boolean;
  onToggle: (tag: string) => void;
}
```

Render a `<button type="button" role="checkbox" aria-checked={selected}>`.

Base style (`.moodBtn`):
```css
.moodBtn {
  padding: 5px 12px;
  border-radius: var(--radius-full);
  border: 2px solid transparent;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease-out;
  opacity: 0.7;
  font-family: inherit;
  /* background and color come from per-tag classes, matching MoodTagChip */
}
.moodBtn:hover { opacity: 0.9; }
.moodBtn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
```

Selected modifier (`.moodBtnSelected`):
```css
.moodBtnSelected {
  opacity: 1;
  font-weight: 600;
  border-color: currentColor;
}
```

Per-tag classes (background + text color from design system Mood Tag Colors table):
```css
.tagHiddenGems    { background: #ECFDF5; color: #059669; }
.tagInstagrammable { background: #FFF1F2; color: #E11D48; }
.tagVibrantNightlife { background: #F5F3FF; color: #7C3AED; }
.tagCulturalHeritage { background: #FFFBEB; color: #D97706; }
.tagAdventure     { background: #FFF7ED; color: #EA580C; }
.tagBeachLife     { background: #ECFEFF; color: #0891B2; }
.tagFoodWine      { background: #FEF2F2; color: #DC2626; }
```

Use `TAG_CLASS_MAP` from `MoodTagChip.constants.ts` to resolve tag → class name — import the map, look up the key, apply `styles[tagClass]` and `styles[selected ? "moodBtnSelected" : ""]`.

## Implementation Notes
- Files created: `src/app/new-trip/page.tsx`, `src/app/new-trip/NewTripClient.tsx`, `src/app/new-trip/NewTripClient.module.css`, `src/components/MoodTagButton/MoodTagButton.tsx`, `src/components/MoodTagButton/MoodTagButton.module.css`
- Files modified: `src/components/Navbar/Navbar.tsx` (Link wiring + Link import), `src/components/index.ts` (MoodTagButton export), `src/components/NewAttractionModal/AttractionTypeChip.tsx` (exported ICONS map)
- Deviations from brief: Added "Add Another Attraction" ghost button below the attraction list (when attractions > 0) to give a non-empty-state entry point to the modal. Duration pill is wrapped in `aria-live="polite"` div per brief.
- New design tokens used: none — all values from existing token set
