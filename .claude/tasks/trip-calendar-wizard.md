# Task: Trip Calendar Wizard

Status: reviewing

Track: A
Track reason: major new UI surface — a multi-day calendar planner that distributes attractions across trip dates; no existing pattern

## Problem
Travelers have a list of attractions but no way to plan *when* during the trip they'll visit each one. There is no tool to visualise the itinerary day-by-day, check if the budget and time fit, or distinguish between the recommended duration for an attraction and the actual time they plan to spend.

## Goal
A calendar wizard on the trip detail page that lets travelers drag or assign attractions to specific days, set their actual planned duration (distinct from the recommended duration stored on the attraction), and see a per-day budget and time summary.

## Requirements

### Data model changes
- Add `plannedDate?: string` (ISO date, one of the trip's days) to Attraction — stored on the attraction document
- Add `actualDurationValue?: string` and `actualDurationUnit?: 'minutes' | 'hours'` to Attraction — the traveler's planned time vs the stored `durationValue`/`durationUnit` (which becomes the "recommended" time)
- Update `PUT /api/attractions/[id]` to accept and save these new fields
- Update `Attraction` TypeScript type in `src/types/attraction.ts`

### UI — Calendar tab on Trip Detail

Add a "Calendar" tab/section to the trip detail page (alongside the existing "Attractions" card). The tab shows:

**Day columns** — one column per calendar day in the trip (startDate → endDate inclusive). Each column header shows the date ("Mon Jul 15") and a time/budget summary bar at the bottom.

**Attraction assignment**:
- Unassigned attractions appear in an "Unscheduled" sidebar on the left
- Each attraction card in the column shows: name, type icon, and two duration values:
  - "Recommended: 2h" (grey, from `durationValue`/`durationUnit`)
  - "Planned: [input]" — editable time input that sets `actualDurationValue`/`actualDurationUnit`
- "Assign to day" button (or simple dropdown) on each unscheduled attraction lets the user pick a date

**Per-day summary** (shown at the bottom of each day column):
- Total planned hours for the day
- Visual indicator if >8h planned (warning colour)

**Budget view** (optional, shown if trip has a budget):
- Distribute total budget across days (budget ÷ days = daily budget)
- Show sum of attraction prices for each day vs the daily budget

**Actions**:
- "Assign" button on each unscheduled attraction → select day → calls `PUT /api/attractions/[id]` with `{ plannedDate }`
- "Unassign" → sets `plannedDate = null`
- Planned duration input → `PUT /api/attractions/[id]` with `{ actualDurationValue, actualDurationUnit }` on blur

### Non-functional
- Responsive: on mobile, days stack vertically (single-column scroll)
- No drag-and-drop required (button-based assignment is sufficient)
- Accessible: day column headings use `<h3>`, attraction cards have `aria-label`

## Constraints
- CSS Modules only, no inline styles
- No DnD library
- Changes are saved immediately via PUT (no "save all" button)
- The Mongoose Attraction schema must be updated; existing attractions will have `null` for the new fields

## Implementation Notes
- Files created: `src/app/trips/[id]/CalendarSection.tsx`, `src/app/trips/[id]/CalendarSection.module.css`
- Files modified: `src/types/attraction.ts` (3 new fields), `src/models/Attraction.ts` (IAttraction + schema + formatAttraction), `src/app/api/attractions/[id]/route.ts` (PUT accepts 3 new fields), `src/app/trips/[id]/TripDetailClient.tsx` (import + render CalendarSection)
- Deviations from brief: `CalendarSection` is co-located in the route folder rather than `components/` — it's tightly coupled to the trip detail page and takes trip/token/isOwner as props, making it a page-specific component rather than a reusable one. The `defaultValue` pattern on the assign `<select>` avoids controlled-component complexity for the one-time assignment action.
- New design tokens used: none

## Out of scope
- Automatic scheduling / AI suggestions
- Sharing the itinerary as a PDF or link
- Real-time collaboration (multi-user editing same trip simultaneously)
- Google Maps integration for route optimisation

---

## Design Brief

### File map
```
src/app/trips/[id]/
  CalendarSection.tsx         ← new "use client" component
  CalendarSection.module.css
  TripDetailClient.tsx        ← modified: add CalendarSection + pass props
src/types/attraction.ts       ← add 3 new optional fields
src/models/Attraction.ts      ← add 3 fields to schema + formatAttraction
src/app/api/attractions/[id]/route.ts  ← PUT accepts new fields
```

---

### Data model changes (backend-first)

**`src/types/attraction.ts`** — add to `Attraction` interface:
```ts
plannedDate?: string | null;         // ISO date string, e.g. "2025-07-15"
actualDurationValue?: string;
actualDurationUnit?: "minutes" | "hours";
```

**`src/models/Attraction.ts`** — add to `IAttraction` + schema + `formatAttraction`:
- Schema: `plannedDate: { type: String }`, `actualDurationValue: { type: String }`, `actualDurationUnit: { type: String, enum: ["minutes", "hours"] }`
- `formatAttraction`: include all three fields

**`PUT /api/attractions/[id]`** — destructure and persist:
```ts
if (plannedDate !== undefined) attraction.plannedDate = plannedDate as string | null;
if (actualDurationValue !== undefined) attraction.actualDurationValue = actualDurationValue as string;
if (actualDurationUnit !== undefined) attraction.actualDurationUnit = actualDurationUnit as "minutes" | "hours";
```

---

### Component: `CalendarSection`

**Props:**
```ts
interface CalendarSectionProps {
  trip: Trip;
  attractions: Attraction[];
  onAttractionsChange: (updated: Attraction[]) => void;
  token: string;
  isOwner: boolean;
}
```

The component manages its local copy of `attractions` for optimistic updates and calls `onAttractionsChange` after each successful PUT so TripDetailClient keeps its list in sync.

**Day generation util** (pure function, inline or utils file):
```ts
function getTripDays(start: string, end: string): string[] {
  const days: string[] = [];
  const d = new Date(start);
  const last = new Date(end);
  while (d <= last) {
    days.push(d.toISOString().split("T")[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}
```
Returns ISO date strings `["2025-07-15", "2025-07-16", ...]`.

**Day label util:**
```ts
function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  }); // → "Mon, Jul 15"
}
```

---

### Page integration

In `TripDetailClient.tsx`, render `<CalendarSection>` **below** the existing two-card grid (overview + attractions), as a third full-width section — not inside the grid. Pass `trip`, `attractions`, `onAttractionsChange={setAttractions}`, `token`, and `isOwner`.

---

### Calendar card shell

Outer `.calendarCard`:
```
background: var(--color-surface); border-radius: var(--radius-xl); box-shadow: var(--shadow-md); padding: 28px
```

Section heading row: `CalendarDays` Lucide icon (or Lucide `CalendarDays` 18px) + `<h2>` "Trip Itinerary" — same `.sectionHeadingRow` + `.sectionIconCircle` pattern as existing cards.

Empty state (no attractions): centred `CalendarDays` icon 36px + `<p>` "Add attractions to start planning your itinerary." — same pattern as existing empty attraction state.

---

### Two-panel layout

`.calendarBody`:
```css
display: flex;
gap: 16px;
align-items: flex-start;
margin-top: 20px;
```

On mobile (max-width 768px): `flex-direction: column`

---

### Left panel — Unscheduled sidebar

`.unscheduledPanel`:
```css
width: 240px;
flex-shrink: 0;
display: flex;
flex-direction: column;
gap: 8px;
```

On mobile: `width: 100%`

**Panel heading**: `font-size: 12px; font-weight: 600; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px`

Text: "Unscheduled ({count})"

**Empty state** (all attractions assigned): `font-size: 13px; color: var(--color-text-tertiary); text-align: center; padding: 16px 8px` — "All attractions scheduled! 🗓"

**Unscheduled attraction card** (`.unscheduledCard`):
```css
background: var(--color-bg-subtle);
border: 1px solid var(--color-border-subtle);
border-radius: var(--radius-md);
padding: 10px 12px;
display: flex;
flex-direction: column;
gap: 6px;
```

Inside the card:
- Top row (`display: flex; align-items: center; gap: 8px`):
  - Type icon circle (24×24, `var(--color-primary-light)`, icon 13px primary) — use `ICONS[types[0]]`
  - Attraction name — `font-size: 13px; font-weight: 600; color: var(--color-text-primary); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- Recommended duration (if `durationValue`): `font-size: 11px; color: var(--color-text-tertiary)` — "Recommended: {durationValue} {durationUnit}"
- Assign select row (only if `isOwner`):
  ```
  display: flex; align-items: center; gap: 6px
  ```
  `<select>` styled like a compact input: `height: 32px; padding: 0 8px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); font-size: 12px; font-family: inherit; color: var(--color-text-secondary); appearance: none; cursor: pointer; flex: 1`
  Options: `<option value="">Assign to day…</option>` + one option per trip day (`{formatDayLabel(dayIso)}` as label, `{dayIso}` as value).
  On `onChange` (value not empty): call PUT `{ plannedDate: value }`, optimistically update local attractions.

---

### Right panel — Day columns

`.dayColumnsWrapper`:
```css
flex: 1;
overflow-x: auto;
-webkit-overflow-scrolling: touch;
scrollbar-width: thin;
```

`.dayColumns`:
```css
display: flex;
gap: 12px;
min-width: max-content; /* prevents wrap; scrolls instead */
```

**Each day column** (`.dayColumn`):
```css
width: 210px;
flex-shrink: 0;
display: flex;
flex-direction: column;
gap: 8px;
```

**Column header** (`.dayHeader`):
```css
padding: 8px 12px;
border-radius: var(--radius-md);
background: var(--color-primary-light);
```
`<h3>` inside: `font-size: 13px; font-weight: 700; color: var(--color-primary); margin: 0; white-space: nowrap`
Text: `formatDayLabel(dayIso)`

**Empty column state** (no attractions assigned to this day):
```css
padding: 24px 12px;
text-align: center;
border: 1.5px dashed var(--color-border-subtle);
border-radius: var(--radius-md);
font-size: 12px;
color: var(--color-text-tertiary);
```
Text: "No attractions"

**Assigned attraction card** (`.dayAttractionCard`):
```css
background: var(--color-surface);
border: 1px solid var(--color-border-subtle);
border-radius: var(--radius-md);
padding: 10px 12px;
display: flex;
flex-direction: column;
gap: 6px;
position: relative;
```

Inside:
- Top row (`display: flex; align-items: center; gap: 8px`):
  - Type icon circle (24×24 — same as unscheduled)
  - Name — same text style
  - Unassign button (only if `isOwner`) — `position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border: none; background: none; cursor: pointer; color: var(--color-text-tertiary); border-radius: var(--radius-sm)`; Lucide `X` 12px; hover: `color: var(--color-error); background: var(--color-bg-subtle)`; `aria-label={`Remove ${name} from this day`}`; on click → PUT `{ plannedDate: null }`, optimistic update.
- Recommended duration row (if exists): `font-size: 11px; color: var(--color-text-tertiary)` — "Rec: {durationValue} {durationUnit}"
- Planned duration row (only if `isOwner`): `display: flex; align-items: center; gap: 4px`
  - Label: `font-size: 11px; color: var(--color-text-secondary)` — "Planned:"
  - `<input type="number" min="0" step="1">`: `width: 48px; height: 28px; padding: 0 6px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 12px; font-family: inherit; text-align: center`; value = `actualDurationValue ?? ""`; on blur → PUT `{ actualDurationValue: value, actualDurationUnit: unit }`
  - `<select>` unit: `height: 28px; padding: 0 4px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 12px; font-family: inherit; background: var(--color-surface); appearance: none; cursor: pointer`; options: "min" (value "minutes"), "h" (value "hours"); value = `actualDurationUnit ?? "hours"`; on change → PUT immediately

**Column footer** (`.dayFooter`):
```css
margin-top: auto;
padding: 8px 12px;
border-radius: var(--radius-md);
background: var(--color-bg-subtle);
font-size: 12px;
color: var(--color-text-secondary);
```

Shows total planned hours for the day. Logic:
```ts
const totalMins = assignedAttractions.reduce((sum, a) => {
  if (!a.actualDurationValue) return sum;
  const val = parseFloat(a.actualDurationValue);
  return sum + (a.actualDurationUnit === "hours" ? val * 60 : val);
}, 0);
const totalHours = (totalMins / 60).toFixed(1);
```

Display: `{totalHours}h planned`
If `totalMins > 480` (>8h): footer background changes to `rgba(245,158,11,0.12)` and text becomes `var(--color-warning)` — use a `.dayFooterWarning` CSS class.

Budget sub-line (only if `trip.budget && days.length > 0`):
Daily budget = `trip.budget / days.length`
Day spend = sum of `attraction.price` for assigned attractions
`font-size: 11px; margin-top: 2px`
Text: `{trip.currency ?? "$"}{daySpend.toFixed(0)} / {trip.currency ?? "$"}{dailyBudget.toFixed(0)} budget`
Over budget: colour `var(--color-error)`. Under: `var(--color-text-tertiary)`.

---

### Accessibility
- `<h2>` "Trip Itinerary" on section, `<h3>` on each day column header
- Assign `<select>`: `aria-label={`Assign ${attractionName} to a day`}`
- Unassign button: `aria-label={`Remove ${attractionName} from ${dayLabel}`}`
- Day columns wrapper: `aria-label="Itinerary calendar"`, `role="region"`
- Planned duration `<input>`: `aria-label={`Planned duration value for ${attractionName}`}`
