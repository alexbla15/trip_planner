# TripPlanner Design System

## Philosophy
Minimalism with atmospheric depth — clean, spacious layouts that let destination photography breathe. Every UI decision serves the "vibe-first" philosophy: travelers should *feel* a destination before they plan it.

**Stack:** Next.js + TypeScript + CSS Modules (no Tailwind, no component library)

---

## Color Tokens

Define in `globals.css` as CSS custom properties:

```css
:root {
  /* Brand */
  --color-primary: #0EA5E9;        /* sky-500 — open skies, oceans */
  --color-primary-dark: #0284C7;   /* sky-600 — hover state */
  --color-primary-light: #E0F2FE;  /* sky-100 — subtle tints */
  --color-accent: #F59E0B;         /* amber-500 — golden hour warmth */
  --color-accent-dark: #D97706;    /* amber-600 — hover state */

  /* Surfaces */
  --color-bg: #FFFFFF;
  --color-bg-subtle: #F8FAFC;      /* slate-50 — page background */
  --color-surface: #FFFFFF;        /* card background */
  --color-border: #E2E8F0;         /* slate-200 */
  --color-border-subtle: #F1F5F9;  /* slate-100 */

  /* Text */
  --color-text-primary: #0F172A;   /* slate-900 */
  --color-text-secondary: #475569; /* slate-600 */
  --color-text-tertiary: #94A3B8;  /* slate-400 */
  --color-text-inverse: #FFFFFF;

  /* Feedback */
  --color-success: #10B981;        /* emerald-500 */
  --color-error: #EF4444;          /* red-500 */
  --color-warning: #F59E0B;        /* amber-500 */
}
```

### Mood Tag Colors (for experience tags)
| Tag | Background | Text |
|-----|-----------|------|
| Hidden Gems | `#ECFDF5` | `#059669` |
| Instagrammable | `#FFF1F2` | `#E11D48` |
| Vibrant Nightlife | `#F5F3FF` | `#7C3AED` |
| Cultural Heritage | `#FFFBEB` | `#D97706` |
| Adventure | `#FFF7ED` | `#EA580C` |
| Beach Life | `#ECFEFF` | `#0891B2` |
| Food & Wine | `#FEF2F2` | `#DC2626` |

---

## Typography

### Font Stack
- **Heading:** `'Plus Jakarta Sans', system-ui, sans-serif` — geometric, premium, modern
- **Body:** `'Inter', system-ui, sans-serif` — ultra-readable, neutral

Load via `next/font/google` in `layout.tsx`.

### Type Scale
| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-xs` | 12px | 400 | 1.5 | Meta, captions |
| `--text-sm` | 14px | 400/500 | 1.5 | Secondary text, labels |
| `--text-base` | 16px | 400 | 1.6 | Body copy |
| `--text-lg` | 18px | 500 | 1.5 | Card titles |
| `--text-xl` | 20px | 600 | 1.4 | Section subheadings |
| `--text-2xl` | 24px | 700 | 1.3 | Section headings |
| `--text-3xl` | 30px | 700 | 1.2 | Page headings |
| `--text-4xl` | 36px | 800 | 1.1 | Hero headings |

---

## Spacing Scale

Base unit: 4px. Always use multiples of 4.

```
4px   (xs)
8px   (sm)
12px  (md-sm)
16px  (md)
24px  (lg)
32px  (xl)
48px  (2xl)
64px  (3xl)
96px  (4xl)
```

---

## Shadows

```css
--shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
--shadow-md:  0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
--shadow-lg:  0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
--shadow-xl:  0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04);
--shadow-card-hover: 0 8px 25px rgba(14,165,233,0.12), 0 3px 8px rgba(0,0,0,0.06);
```

---

## Border Radius

```css
--radius-sm:   6px;   /* chips, badges, small inputs */
--radius-md:   10px;  /* buttons */
--radius-lg:   16px;  /* cards */
--radius-xl:   24px;  /* large cards, hero panels */
--radius-full: 9999px; /* pills, avatars, tags */
```

---

## Breakpoints

```css
/* Mobile-first */
/* sm  */ @media (min-width: 640px) {}
/* md  */ @media (min-width: 768px) {}
/* lg  */ @media (min-width: 1024px) {}
/* xl  */ @media (min-width: 1280px) {}
```

Max content width: `1280px` (centered, `padding: 0 24px`).

---

## Component Patterns

### Navbar
- Height: 64px, sticky, `background: rgba(255,255,255,0.95)`, `backdrop-filter: blur(8px)`
- Left: Logo (plane icon + "TripPlanner" wordmark in Plus Jakarta Sans bold)
- Right: nav links (Explore, My Trips) + "New Trip" primary button + avatar
- Border-bottom: `1px solid var(--color-border-subtle)`

### Trip Card (`TripCard`)
- Size: min-width 280px, aspect ratio of image 16:9
- Structure: image (top, `border-radius: 16px 16px 0 0`) → body (destination, dates, mood tags)
- Hover: `transform: translateY(-2px)`, shadow escalates to `--shadow-card-hover`
- Transition: `200ms ease-out` on transform + shadow
- Image overlay: gradient from transparent to `rgba(0,0,0,0.3)` at bottom (for title legibility if shown on image)

### New Trip CTA Card
- Same dimensions as TripCard
- Background: dashed border (`2px dashed var(--color-border)`) with subtle sky-50 fill
- Center: `+` icon (32px) + "Plan a new adventure" text
- Hover: border becomes `var(--color-primary)`, background `var(--color-primary-light)`
- Transition: `200ms ease-out`

### Explore Card
- Slightly taller than TripCard (more image surface)
- Community attribution: avatar + username overlay in bottom-left of image
- Mood tag chip in top-right of image (floating badge)

### Mood Tag Chip
- Padding: `4px 10px`
- Border-radius: `--radius-full`
- Font: 12px, weight 600
- Colors from Mood Tag table above

### Primary Button
- Background: `var(--color-primary)`, text: white
- Padding: `10px 20px`, border-radius: `--radius-md`
- Font: 14px, weight 600
- Hover: `var(--color-primary-dark)`, slight scale `1.01`
- Transition: `150ms ease-out`
- Min touch target: 44px height

### Section Header
- Title: `--text-2xl`, weight 700, `var(--color-text-primary)`
- Subtitle/count: `--text-sm`, `var(--color-text-tertiary)`, inline after title
- "See all" link: `--text-sm`, weight 500, `var(--color-primary)`, right-aligned

---

## Page Layout

### Dashboard Grid
- Desktop (≥1024px): 4-column card grid for My Trips (first slot = New Trip CTA), 3-column for Explore
- Tablet (768–1023px): 2-column grids
- Mobile (<768px): 1-column, full-width cards (horizontally scrollable on mobile for My Trips)

### Section Spacing
- Between sections: `64px` vertical gap
- Section internal padding: `0 0 32px`
- Card gap: `24px`

---

## Animation Tokens

```css
--duration-fast:   150ms;
--duration-base:   200ms;
--duration-slow:   300ms;
--easing-out:      cubic-bezier(0.0, 0.0, 0.2, 1);
--easing-in-out:   cubic-bezier(0.4, 0.0, 0.2, 1);
```

All interactive elements: `transition: all var(--duration-base) var(--easing-out)`.

---

## Icons

Use **Lucide React** (`lucide-react`) — stroke-based, consistent 2px stroke width.
Key icons needed: `Plus`, `MapPin`, `Calendar`, `Compass`, `Globe`, `User`, `Search`, `ChevronRight`, `Plane`.

Install: `npm install lucide-react`

---

## Anti-Patterns (Do Not)
- No emojis as structural icons — use Lucide SVG icons
- No information-dense lists — cards breathe with whitespace
- No raw hex colors in components — always use CSS custom property tokens
- No fixed pixel widths on containers — use max-width + percentage
- No hover-only interactions — all states must work on touch
- No gray-on-gray text — always meet 4.5:1 contrast minimum
