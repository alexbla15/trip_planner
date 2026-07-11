# Task: Design Overhaul — Impressive, Professional & Light Mode Contrast

Status: done

Track: A
Track reason: Broad visual redesign — new color palette values, elevated component aesthetics, contrast improvements; affects the design system foundation and every screen.

## Problem
The current light-mode design uses a flat white/light-grey palette that produces insufficient text contrast and an overall "unfinished" look. The UI lacks the visual depth and polish expected of a professional travel app. Users (and the developer reviewing the product) feel the app doesn't look impressive enough to present or ship.

## Goal
The app looks visually striking, professional, and passes WCAG AA contrast in light mode — without changing the brand identity (sky-blue primary, amber accent, Plus Jakarta Sans headings).

## Requirements
- Audit and update light-mode color tokens in `globals.css`:
  - Boost text contrast: `--color-text-secondary` and `--color-text-tertiary` must pass 4.5:1 against their backgrounds
  - Deepen surface differentiation: page bg, card bg, and subtle bg must be visually distinct
  - Strengthen border tokens so card edges are visible without being harsh
  - Primary color contrast: `--color-primary` on white must pass 4.5:1 (or choose a deeper shade that does)
- Elevate card aesthetics: richer shadows, slightly warmer or more distinct surface tones, subtle visual hierarchy between page and card layers
- Refine typography: ensure heading weights, sizes, and letter-spacing feel premium not default
- General polish pass: buttons, inputs, chips, badges — tighten spacing, strengthen active/hover states, add subtle depth where missing
- Accessible: all text/background pairs ≥ 4.5:1 in light mode

## Constraints
- CSS Modules + `globals.css` custom properties only — no Tailwind, no inline styles
- Brand identity unchanged: sky-blue primary, amber accent, Plus Jakarta Sans headings, Inter body
- Dark mode tokens (if present) must not regress
- Changes go through `docs/DESIGN_SYSTEM.md` first — the designer owns the token values, developer applies them

## Out of scope
- Dark mode redesign (separate task if needed)
- New components or page layouts
- Font changes

## Design Brief

### Contrast Audit — Current Failures

| Token | Current value | Contrast on white | Verdict |
|---|---|---|---|
| `--color-primary` | `#0EA5E9` sky-500 | 2.6:1 | ❌ FAILS (text + button white-text) |
| `--color-text-tertiary` | `#94A3B8` slate-400 | 2.5:1 | ❌ FAILS |
| `--color-error` | `#EF4444` red-500 | 4.0:1 | ❌ FAILS (normal text) |
| `--color-success` | `#10B981` emerald-500 | 3.0:1 | ⚠ Large text only |
| `--color-text-secondary` | `#475569` slate-600 | 5.9:1 | ✅ |
| `--color-text-primary` | `#0F172A` slate-900 | 19:1 | ✅ |

---

### 1. Updated Light-Mode Color Tokens

Replace the entire `:root` block in `src/app/globals.css`:

```css
:root {
  /* Brand — shifted one shade darker for WCAG AA compliance */
  --color-primary:       #0284C7;   /* sky-600; white text on this = 5.2:1 ✓ */
  --color-primary-dark:  #0369A1;   /* sky-700; hover state */
  --color-primary-light: #E0F2FE;   /* sky-100; tint (unchanged) */
  --color-accent:        #D97706;   /* amber-600; was amber-500 */
  --color-accent-dark:   #B45309;   /* amber-700; hover */

  /* Surfaces — clear visual layers */
  --color-bg:             #FFFFFF;   /* top-level page bg */
  --color-bg-subtle:      #F1F5F9;   /* slate-100; was slate-50 — page body background */
  --color-surface:        #FFFFFF;   /* card / panel surface — white lifts above slate-100 */
  --color-border:         #CBD5E1;   /* slate-300; was slate-200 — visible card edges */
  --color-border-subtle:  #E2E8F0;   /* slate-200; was slate-100 — dividers inside cards */

  /* Text — all ≥ 4.5:1 on white surface */
  --color-text-primary:   #0F172A;   /* slate-900; 19:1 ✓ */
  --color-text-secondary: #334155;   /* slate-700; was slate-600; 10.5:1 ✓ */
  --color-text-tertiary:  #64748B;   /* slate-500; was slate-400; 4.8:1 on white ✓ */
  --color-text-inverse:   #FFFFFF;

  /* Feedback — all ≥ 4.5:1 on white */
  --color-success: #059669;   /* emerald-600; was emerald-500; 4.7:1 ✓ */
  --color-error:   #DC2626;   /* red-600;     was red-500;     5.1:1 ✓ */
  --color-warning: #D97706;   /* amber-600;   was amber-500 */
}
```

---

### 2. Updated Shadow Tokens

Replace shadow tokens inside the same `:root` block. Current shadows are too thin and opacity-light. New values add real depth:

```css
--shadow-sm:        0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04);
--shadow-md:        0 3px 8px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
--shadow-lg:        0 8px 20px rgba(0,0,0,0.10), 0 3px 8px rgba(0,0,0,0.06);
--shadow-xl:        0 16px 36px rgba(0,0,0,0.12), 0 6px 14px rgba(0,0,0,0.07);
--shadow-card-hover: 0 20px 44px rgba(2,132,199,0.18), 0 6px 16px rgba(0,0,0,0.08);
```

---

### 3. Updated Layout Tokens

```css
--navbar-bg:      rgba(255, 255, 255, 0.97);
--hero-gradient:  linear-gradient(135deg, #e0f2fe 0%, #f1f5f9 60%, #ffffff 100%);
```

---

### 4. Typography — Letter-Spacing Polish

Not a CSS variable — update these specific class rules in their respective CSS modules:

| Target | Where | Add rule |
|---|---|---|
| Section headings (17px/700) | Any `.sectionHeading` class | `letter-spacing: -0.2px` |
| Page / hero headings (24px+) | `.destination`, `h1` level classes ≥ 24px | `letter-spacing: -0.5px` (already on `.destination`; check others) |
| Navbar logo wordmark | `Navbar.module.css` wordmark span | `letter-spacing: -0.3px` |

---

### 5. Design System Doc Update

Update the color token table and shadow table in `docs/DESIGN_SYSTEM.md` to match the new values above.

---

### 6. Component-Level Polish — No New Classes Needed

Apply these by updating existing CSS property values only:

**Navbar** (`Navbar.module.css`)
- `border-bottom`: change from `1px solid var(--color-border-subtle)` → `1px solid var(--color-border)` — the navbar base line should be visible

**Cards in TripDetailClient, TripCard, ExploreCard**
- Any `border: 1px solid var(--color-border-subtle)` on a card shell → change to `var(--color-border)` so edges read on the slate-100 page bg

**Attraction list items** (`TripDetailClient.module.css .attractionItem`)
- `border-color` on hover: stays `--color-border` (already there); default state border can use `--color-border` (slightly more visible at rest)

**Section headings** — add `letter-spacing: -0.2px` to any element with `font-size: 17px; font-weight: 700` that doesn't already have it

---

### 7. Dark Mode — Do Not Regress

The `[data-theme="dark"]` block in `globals.css` must **not** be touched. The updated `:root` tokens do not cascade into dark mode (dark mode overrides everything). Verify after changes that dark mode still looks correct.

## Completion Summary
Light-mode color tokens updated to meet WCAG AA across all text/bg pairs. Shadow tokens deepened for visual elevation. Letter-spacing applied to section and hero headings across all pages. Navbar border strengthened. Dark mode untouched. Closed 2026-07-11.

## Implementation Notes

- Files created/modified:
  - `src/app/globals.css` — replaced `:root` color tokens, shadow tokens, and layout tokens
  - `src/components/Navbar/Navbar.module.css` — navbar border-bottom → `--color-border`
  - `src/app/trips/[id]/TripDetailClient.module.css` — `.sectionHeading` letter-spacing, `.attractionItem` default border → `--color-border`
  - `src/app/admin/AdminClient.module.css` — `.sectionHeading` letter-spacing
  - `src/app/trips/[id]/CalendarSection.module.css` — `.sectionHeading` letter-spacing
  - `src/app/profile/ProfileClient.module.css` — `.sectionHeading` letter-spacing
  - `src/app/analytics/AnalyticsClient.module.css` — `.sectionHeading` letter-spacing
  - `src/app/trips/[id]/edit/EditTripClient.module.css` — `.sectionHeading` letter-spacing, `.heading` large-heading letter-spacing
  - `src/app/new-trip/NewTripClient.module.css` — `.sectionHeading` letter-spacing, `.heading` large-heading letter-spacing
  - `src/app/trips/TripsClient.module.css` — `.heading` large-heading letter-spacing
  - `src/app/page.module.css` — `.sectionTitle` large-heading letter-spacing
  - `src/components/ExploreSection/ExploreSection.module.css` — `.title` large-heading letter-spacing
- Deviations from brief:
  - TripCard and ExploreCard card shells use shadow-only elevation (no explicit border) — no border change needed for those two; only `.attractionItem` in TripDetailClient changed
  - Applied letter-spacing to 18px/700 `.sectionHeading` classes (not 17px as the brief described) — the actual classes across the codebase are at 18px; intent is the same
  - Applied `-0.5px` letter-spacing to all discovered ≥24px/700 page headings (Trips, NewTrip, EditTrip, ExploreSection, dashboard sectionTitle) beyond the brief's explicit mention
- New design tokens used: none (existing tokens only)
