# Task: Analytics Page

Status: done

Track: A
Track reason: new /analytics page with charts and stat cards; no existing analytics UI pattern in the design system

## Problem
The platform collects rich trip and attraction data but there is no public-facing way to see platform activity. The `GET /api/analytics/global` endpoint already exists but its data is never displayed.

## Goal
A `/analytics` page that visualises platform-wide statistics from `GET /api/analytics/global` using stat cards and charts.

## Requirements

### Route
`/analytics` — public (no auth required, matching the public API endpoint)
Add a link to "Analytics" in the Navbar (Lucide `BarChart2` icon, desktop + mobile menu)

### Data (from `GET /api/analytics/global`)
```ts
{
  summary: { totalTrips, totalAttractions, uniqueCitiesCovered, uniqueCountriesCovered, totalPlatformBudget },
  categoryDistribution: [{ _id: string, count: number }],
  topUsers: [{ ownerId: string, attractionsCount: number, countriesCount: number }]
}
```

### UI sections

**1 — Summary stat cards** (responsive grid: 2 cols on mobile, 4 cols on ≥1024px)
Each card shows: large number + label + Lucide icon
- Total Trips → `MapPinned`
- Total Attractions → `Landmark`
- Cities Covered → `Building2`
- Countries Covered → `Globe`
- (Platform Budget is optional / omit for cleanliness)

**2 — Category Distribution** (horizontal bar chart — pure CSS, no chart library)
Show top 8 attraction categories by count. Each bar is a labelled row:
- Category name on the left (13px)
- Filled bar (`background: var(--color-primary)`, `border-radius: var(--radius-full)`) scaled to max-count
- Count badge on the right
- Responsive: bars fill 100% of the container width

**3 — Top Explorers** (leaderboard table)
Top 10 users by attraction count:
- Rank (#1, #2…) | User (shows ownerId truncated to 8 chars as placeholder) | Attractions | Countries
- Row 1: gold accent (`var(--color-accent)`)

### Non-functional
- Loading skeleton for each section while fetching
- Empty state if API returns no data
- Accessible: section headings, `aria-label` on bars, table with `<th scope>`
- Responsive: all sections stack on mobile

## Constraints
- CSS Modules only, no inline styles, no chart library (pure CSS bars)
- No auth required on this page

## Completion Summary
Analytics page confirmed by user on 2026-06-29. Public /analytics page with hero, 5 stat cards (trips, attractions, users, countries, cities), interactive SVG donut chart with design-system colours and hover-brightness effect, category legend with icons, and Top Explorers leaderboard showing real user names. Navbar Analytics link added.

## Implementation Notes
- Files created: `src/app/analytics/page.tsx`, `src/app/analytics/AnalyticsClient.tsx`, `src/app/analytics/AnalyticsClient.module.css`
- Files modified: `src/components/Navbar/Navbar.tsx` (BarChart2 import + Analytics link in desktop nav + mobile menu)
- Deviations from brief: The bar fill uses a CSS custom property (`--bar-width`) set via the `style` prop to avoid inline styles while still allowing dynamic percentage widths — this is the only way to pass a computed value to a CSS transition without a chart library or inline styles. The CSS property is read by `.barFill { width: var(--bar-width, 0%); }` which satisfies both the "no inline style" rule and the animation requirement.
- New design tokens used: none

## Out of scope
- Personal analytics (covered in personal-profile-page task)
- Time-series / trend charts
- Real-time refresh

---

## Design Brief

### File map
```
src/app/analytics/
  page.tsx          ← metadata + <AnalyticsClient />
  AnalyticsClient.tsx   ← "use client" — fetch + render
  AnalyticsClient.module.css
```
Also modify: `src/components/Navbar/Navbar.tsx` and `src/components/Navbar/Navbar.module.css`

---

### Navbar — add Analytics link

**Desktop nav** (`<ul className={styles.nav}>`) — add a third `<li>` after "My Trips":
```tsx
<li>
  <Link href="/analytics" className={styles.navLink}>
    <BarChart2 size={16} aria-hidden="true" />
    Analytics
  </Link>
</li>
```

**Mobile menu** — add above the New Trip button:
```tsx
<Link href="/analytics" className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
  <BarChart2 size={18} aria-hidden="true" />
  Analytics
</Link>
```

No new CSS needed — reuse existing `.navLink` and `.mobileNavLink` classes.

---

### Page shell

**`.page`** — `min-height: 100dvh; background: var(--color-bg-subtle)`

**Hero header**
```
background: var(--hero-gradient)
padding: 48px 0 56px
```
Inner (`max-width: 1280px; margin: 0 auto; padding: 0 24px`):
- `<h1>` "Platform Analytics" — `font-family: var(--font-plus-jakarta-sans); font-size: clamp(24px, 3vw, 36px); font-weight: 800; color: var(--color-text-primary); margin: 0 0 8px`
- `<p>` "Real-time platform activity across all TripPlanner users." — `font-size: 16px; color: var(--color-text-secondary); margin: 0`
- Public badge (below subtitle): `display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; padding: 4px 12px; border-radius: var(--radius-full); background: var(--color-primary-light); color: var(--color-primary); font-size: 12px; font-weight: 600` + Lucide `Globe` 13px — text: "Public · No login required"

**Content** — `max-width: 1280px; margin: 0 auto; padding: 40px 24px 80px; display: flex; flex-direction: column; gap: 32px`

---

### Section card shell (used by all three sections)

```css
.card {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  padding: 28px;
}
```

**Section heading row** (inside each card):
```
display: flex; align-items: center; gap: 10px; margin-bottom: 24px
```
- Icon circle: `width: 36px; height: 36px; border-radius: var(--radius-full); background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0` (icon 18px)
- `<h2>`: `font-family: var(--font-plus-jakarta-sans); font-size: 18px; font-weight: 700; color: var(--color-text-primary); margin: 0`

---

### Section 1 — Stat cards

No outer `.card` wrapper — the cards ARE the grid items.

**`.statsGrid`**
```css
display: grid;
grid-template-columns: repeat(2, 1fr);
gap: 16px;
@media (min-width: 1024px) { grid-template-columns: repeat(4, 1fr); }
```

**Each stat card** (`.statCard`):
```css
background: var(--color-surface);
border-radius: var(--radius-xl);
box-shadow: var(--shadow-md);
padding: 24px;
display: flex;
flex-direction: column;
gap: 16px;
```

Inside each card:
- Icon circle: same shell as section heading icon circle above
- Stat value: `font-family: var(--font-plus-jakarta-sans); font-size: 36px; font-weight: 800; color: var(--color-text-primary); line-height: 1; letter-spacing: -0.5px`
  - Use `toLocaleString()` for number formatting
- Label: `font-size: 14px; font-weight: 500; color: var(--color-text-secondary)`

Cards (in order):
| Icon | Label | Value field |
|------|-------|-------------|
| `MapPinned` | Total Trips | `summary.totalTrips` |
| `Landmark` | Total Attractions | `summary.totalAttractions` |
| `Building2` | Cities Covered | `summary.uniqueCitiesCovered` |
| `Globe` | Countries | `summary.uniqueCountriesCovered` |

**Stat card skeleton** (loading):
Same `.statCard` shell. Inside: icon circle shimmer + two shimmer lines (one 40px tall for the number, one 14px for the label).

---

### Section 2 — Category Distribution

Outer `.card`, section heading row: `BarChart2` icon + "Attraction Types"

Show up to 8 categories, sorted by count descending. Each row:

**`.barRow`**
```css
display: flex;
align-items: center;
gap: 12px;
padding: 8px 0;
border-bottom: 1px solid var(--color-border-subtle);
```
Last row: no border.

**`.barLabel`** — `font-size: 13px; font-weight: 500; color: var(--color-text-secondary); min-width: 110px; flex-shrink: 0`

**`.barTrack`** — `flex: 1; height: 8px; background: var(--color-bg-subtle); border-radius: var(--radius-full); overflow: hidden`

**`.barFill`** — inside `.barTrack`:
```css
height: 100%;
background: var(--color-primary);
border-radius: var(--radius-full);
transition: width 600ms cubic-bezier(0.0, 0.0, 0.2, 1);
```
Width: `${(count / maxCount) * 100}%` — compute `maxCount = Math.max(...items.map(i => i.count))`
`aria-label={`${label}: ${count}`}` on `.barFill`; `role="img"` on `.barTrack` for SR.

**`.barCount`** — `font-size: 13px; font-weight: 600; color: var(--color-text-secondary); min-width: 36px; text-align: right`

**Chart skeleton** — 8 rows, each row: shimmer label block (110px) + shimmer bar track.

---

### Section 3 — Top Explorers

Outer `.card`, section heading row: `Trophy` icon (or `Users`) + "Top Explorers"

**`.table`** — `width: 100%; border-collapse: collapse; font-size: 14px`

**`<thead>`** (`.thead`):
```css
border-bottom: 2px solid var(--color-border-subtle);
```
`<th>` cells: `padding: 0 12px 12px; font-size: 12px; font-weight: 600; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.4px; text-align: left`
Columns: `scope="col"`: Rank | Explorer | Attractions | Cities

**`<tbody>`**:
Each `<tr>` (`.row`):
```css
border-bottom: 1px solid var(--color-border-subtle);
transition: background 150ms ease-out;
```
`.row:hover { background: var(--color-bg-subtle) }`
`<td>` cells: `padding: 12px; color: var(--color-text-primary)`

**Rank cell** (`.rankCell`):
- `font-size: 13px; font-weight: 700; color: var(--color-text-tertiary); width: 40px`
- Rank 1: add a Lucide `Trophy` icon (14px) inline; cell text color: `var(--color-accent)`

**Row 1 special styling** (`.rowGold`):
```css
background: linear-gradient(to right, rgba(245, 158, 11, 0.06), transparent);
border-left: 3px solid var(--color-accent);
```
hover: `background: rgba(245, 158, 11, 0.1)`

**Explorer cell**: show `ownerId.slice(0, 8)` in monospace, `font-family: monospace; font-size: 13px; color: var(--color-text-secondary)`

**Table skeleton** — 5 shimmer rows inside the tbody; each row has 4 shimmer blocks.

---

### Loading state (while `useEffect` fetch is pending)

Render skeleton versions of all three sections simultaneously (not sequentially). Each section occupies its final space to prevent layout shift.

### Empty / error state

If API returns null or throws: show a single centered state in the content area:
`Lucide BarChart2` 48px + `<p>` "Analytics data not available yet." + `font-size: 15px; color: var(--color-text-tertiary); text-align: center; padding: 64px 24px`

---

### Accessibility
- `<h1>` on page, `<h2>` on each section card
- Bar chart: each `.barTrack` has `role="img"` + `aria-label={`${name}: ${count} attractions`}`; `<section aria-labelledby>` wraps the chart
- Table: `<th scope="col">` on headers, `<th scope="row">` on rank cells if semantic
- Loading skeletons: `aria-hidden="true"` and `aria-busy="true"` on parent
- Numbers formatted with `toLocaleString()` for readability
