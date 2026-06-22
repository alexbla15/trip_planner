# Task: Main Dashboard

Status: reviewing

Track: A
Track reason: new primary UI surface with multiple sections, interaction patterns, and layout — no existing design system

## Problem
Travelers landing on TripPlanner need a central home base after login. Without a clear dashboard, users can't quickly access their planned trips, discover new destinations, or start a new trip — making the app feel incomplete and directionless.

## Goal
Build the main dashboard page that serves as the user's home hub, featuring their trips, a discovery section for attractions and community trips, and a prominent entry point to create a new trip.

## Requirements
- **My Trips section:** Grid or card list of the user's existing trips, each showing destination, dates, and a cover image/thumbnail. Empty state when no trips exist.
- **Explore section:** Browse community-shared trips and attractions from around the globe, filtered by mood/experience tags (e.g. Hidden Gems, Instagrammable Spots, Vibrant Nightlife) — aligned with the app's "vibe-first" philosophy from idea.md.
- **Add a New Trip CTA:** Prominent, accessible button/card to create a new trip — visible at a glance, not buried.
- Responsive layout (mobile + desktop)
- Fast, minimalist, and intuitive — avoids information overload (core competitive differentiator per idea.md)

## Constraints
- No backend/API yet — use realistic placeholder/mock data for trips and attractions
- Must feel like a real product, not a wireframe — polished visual design
- Aligns with TripPlanner's brand: blending logistics with destination "vibe"

## Out of scope
- Actual trip creation flow (just the entry point CTA)
- Authentication / login flow
- Real map integration
- Budget tracker UI

---

## Design Brief

### Visual Style
**Modern Minimalism with Atmospheric Depth.** Clean, spacious layouts that let destination photography breathe. The UI recedes so imagery and destination "vibe" come forward. Inspired by premium travel brands — Airbnb, Monocle Travel, Notion — but warmer.

### Design System Reference
Full tokens in `docs/DESIGN_SYSTEM.md`. Summary:
- **Primary color:** `#0EA5E9` (sky blue — open skies, ocean)
- **Accent:** `#F59E0B` (amber — golden hour warmth)
- **Background:** `#F8FAFC` (slate-50, off-white page)
- **Cards:** white, `border-radius: 16px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.1)`
- **Heading font:** Plus Jakarta Sans (bold, geometric)
- **Body font:** Inter (readable, neutral)
- **Icons:** Lucide React — stroke-style, consistent 2px stroke

### Page Structure (top to bottom)

#### 1. Sticky Navbar (64px)
- Left: Plane icon (Lucide `Plane`, sky-500) + "TripPlanner" wordmark (Plus Jakarta Sans, 700, 20px)
- Center (desktop): nav links "Explore" and "My Trips" — `--text-sm`, weight 500, slate-600; active state = sky-500 with underline dot
- Right: "+ New Trip" primary button (sky-500 bg, white text) + circular avatar placeholder (32px)
- Background: `rgba(255,255,255,0.95)` + `backdrop-filter: blur(8px)`, border-bottom subtle
- On mobile: hamburger menu collapses center links

#### 2. Hero Greeting Strip (below navbar)
- Background: subtle gradient `linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 60%)` (sky-50 → white)
- Content (centered, max-width 1280px, 64px vertical padding):
  - Greeting: "Good morning, Alex ✈" — `--text-4xl` (36px), Plus Jakarta Sans 800, slate-900
  - Subline: "Where will your next adventure take you?" — `--text-lg`, slate-500
  - Two CTAs side by side: `[+ Plan a New Trip]` (primary button, sky-500) + `[Explore Destinations]` (ghost button, sky-500 border+text)
- No large hero image — keeps load fast, avoids "heavy" feel on the dashboard

#### 3. My Trips Section
- Section header row: "My Trips" (`--text-2xl`, 700) + grey count badge "(3)" + "See all →" link right-aligned
- Card grid:
  - **Desktop (≥1024px):** 4 columns — first slot is always the New Trip CTA card, rest are TripCards
  - **Tablet (768–1023px):** 2 columns
  - **Mobile (<768px):** Horizontal scroll row (overflow-x: auto, no wrap), cards 280px wide
- Card gap: 24px

**New Trip CTA Card (always first slot):**
- Same size as TripCard
- Dashed border: `2px dashed #CBD5E1` (slate-300)
- Background: `#F8FAFC`
- Center content: Lucide `Plus` icon (48px, sky-400) above text "Plan a new adventure" (slate-500, 14px)
- Hover: border becomes sky-500, background sky-50, icon becomes sky-600
- Transition: 200ms ease-out
- `role="button"`, keyboard focusable

**TripCard:**
- Image: 16:9 aspect ratio, `object-fit: cover`, `border-radius: 16px 16px 0 0`
- Image overlay: gradient bottom 40% → `rgba(0,0,0,0.25)` for subtle depth
- Card body (below image): 16px padding
  - Destination: `--text-lg`, 600, slate-900
  - Dates: Lucide `Calendar` icon (14px, slate-400) + "Jul 15 – Jul 22, 2025" (`--text-sm`, slate-500)
  - Mood tags: pill chips (see Mood Tag Colors in DESIGN_SYSTEM.md), max 2 visible
- Hover: `translateY(-2px)`, shadow escalates to `--shadow-card-hover`

**Mock data for My Trips (3 trips):**
```ts
[
  {
    id: "1",
    destination: "Tokyo, Japan",
    coverImage: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
    startDate: "Jul 15, 2025",
    endDate: "Jul 22, 2025",
    tags: ["Cultural Heritage", "Food & Wine"]
  },
  {
    id: "2",
    destination: "Paris, France",
    coverImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
    startDate: "Aug 5, 2025",
    endDate: "Aug 12, 2025",
    tags: ["Instagrammable", "Food & Wine"]
  },
  {
    id: "3",
    destination: "Lisbon, Portugal",
    coverImage: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&q=80",
    startDate: "Sep 1, 2025",
    endDate: "Sep 7, 2025",
    tags: ["Hidden Gems", "Beach Life"]
  }
]
```

#### 4. Explore Section
- Section header: "Explore the World" (`--text-2xl`, 700) + "Discover trips and attractions shared by the community" subline (`--text-sm`, slate-500)
- **Mood filter chips** (horizontal scrollable row on mobile):
  - Options: All · Hidden Gems · Instagrammable · Vibrant Nightlife · Cultural Heritage · Adventure · Beach Life · Food & Wine
  - Active chip: sky-500 bg, white text
  - Inactive chip: white bg, slate-300 border, slate-600 text
  - On click: active filter updates — filter chips are interactive (use React state, no routing needed yet)
- **Explore Card Grid:** 3 columns desktop, 2 tablet, 1 mobile — 24px gap
- Cards are taller than TripCards (image takes more vertical space)

**ExploreCard:**
- Image: `aspect-ratio: 4/3`, covers full card top
- Floating mood tag badge: top-right on image (pill chip with background)
- Community attribution bar (bottom of image overlay): avatar circle (28px) + "@username" (12px, white, bold)
- Card body: destination name (`--text-lg`, 600) + location line (Lucide `MapPin` 14px + city) + like count (Lucide `Heart` 14px + number)
- Hover: same card lift as TripCard

**Mock data for Explore (8 cards, filterable by tag):**
```ts
[
  { id: "e1", destination: "Santorini, Greece", coverImage: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80", tag: "Instagrammable", user: "sara_travels", likes: 342 },
  { id: "e2", destination: "Bangkok, Thailand", coverImage: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80", tag: "Vibrant Nightlife", user: "mikeadventures", likes: 218 },
  { id: "e3", destination: "Kyoto, Japan", coverImage: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80", tag: "Cultural Heritage", user: "wanderjapan", likes: 501 },
  { id: "e4", destination: "Amalfi Coast, Italy", coverImage: "https://images.unsplash.com/photo-1533934978-6f7d60e00651?w=600&q=80", tag: "Hidden Gems", user: "italyvibes", likes: 187 },
  { id: "e5", destination: "Bali, Indonesia", coverImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80", tag: "Beach Life", user: "balibliss", likes: 634 },
  { id: "e6", destination: "Patagonia, Argentina", coverImage: "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&q=80", tag: "Adventure", user: "wildexplorer", likes: 289 },
  { id: "e7", destination: "Lyon, France", coverImage: "https://images.unsplash.com/photo-1556559911-b8b97b789baa?w=600&q=80", tag: "Food & Wine", user: "frenchfoodie", likes: 156 },
  { id: "e8", destination: "Faroe Islands", coverImage: "https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=600&q=80", tag: "Hidden Gems", user: "nordic_paths", likes: 423 }
]
```

#### 5. Footer
- Minimal: `© 2025 TripPlanner · Made with ☁️ for wanderers` — centered, slate-400, 14px, 48px vertical padding
- Keep it lightweight — not a full footer block

---

### File Structure to Create
```
src/
  app/
    page.tsx                    ← replace boilerplate with Dashboard
    globals.css                 ← extend with design tokens + font imports
    layout.tsx                  ← already updated (title/description)
  components/
    Navbar/
      Navbar.tsx
      Navbar.module.css
    TripCard/
      TripCard.tsx
      TripCard.module.css
    NewTripCard/
      NewTripCard.tsx
      NewTripCard.module.css
    ExploreCard/
      ExploreCard.tsx
      ExploreCard.module.css
    MoodTagChip/
      MoodTagChip.tsx
      MoodTagChip.module.css
  data/
    mockTrips.ts
    mockExplore.ts
  types/
    trip.ts
```

### Mood Tag Color Mapping
Define as a lookup object in `MoodTagChip.tsx`:
```ts
const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  "Hidden Gems":       { bg: "#ECFDF5", text: "#059669" },
  "Instagrammable":    { bg: "#FFF1F2", text: "#E11D48" },
  "Vibrant Nightlife": { bg: "#F5F3FF", text: "#7C3AED" },
  "Cultural Heritage": { bg: "#FFFBEB", text: "#D97706" },
  "Adventure":         { bg: "#FFF7ED", text: "#EA580C" },
  "Beach Life":        { bg: "#ECFEFF", text: "#0891B2" },
  "Food & Wine":       { bg: "#FEF2F2", text: "#DC2626" },
};
```

### Accessibility Requirements
- All images: meaningful `alt` text
- New Trip CTA card: `role="button"` + `tabIndex={0}` + keyboard `Enter`/`Space` handler
- Mood filter chips: `role="radio"` group or `aria-pressed` buttons
- Navbar: `<nav>` with `aria-label="Main navigation"`
- Skip-to-main: `<a href="#main-content" className="sr-only">Skip to main content</a>`
- Focus rings: visible on all interactive elements (never removed)
- Touch targets: minimum 44px height on all clickable elements

### Key UX Notes
- The New Trip CTA card must be equally prominent to the trip cards — it IS a card, not a secondary button
- Mood filter state is local React state — no URL params needed yet
- Images use Next.js `<Image>` with declared `width`/`height` to prevent CLS
- Unsplash URLs above are valid direct image URLs — safe to use as `<img src>` or Next.js Image `src` in development
- Card hover transitions must NOT change layout (use `transform`, not `margin`)
- The explore grid re-renders when filter changes — filter by exact tag string match; "All" shows all cards

---

## Implementation Notes

- Files created/modified:
  - `next.config.ts` — added Unsplash `remotePatterns`
  - `src/app/globals.css` — full design token system (CSS custom properties)
  - `src/app/layout.tsx` — replaced Geist with Inter + Plus Jakarta Sans via `next/font/google`
  - `src/app/page.tsx` — replaced boilerplate with Dashboard (Server Component)
  - `src/app/page.module.css` — dashboard layout styles
  - `src/types/trip.ts` — `Trip`, `ExploreItem`, `MoodTag` types
  - `src/data/mockTrips.ts` — 3 mock trips
  - `src/data/mockExplore.ts` — 8 mock explore items
  - `src/components/MoodTagChip/` — chip component with per-tag CSS classes
  - `src/components/TripCard/` — trip card with `fill` image + hover lift
  - `src/components/NewTripCard/` — Client Component, dashed CTA card
  - `src/components/ExploreCard/` — explore card with floating tag + attribution
  - `src/components/ExploreSection/` — Client Component with filter state
  - `src/components/Navbar/` — Client Component with mobile menu toggle
  - `src/components/index.ts` — barrel export
  - `docs/DESIGN_SYSTEM.md` — created as design source of truth
- Deviations from brief:
  - `MoodTagChip` color applied via CSS module classes (per-tag rules), not inline style — avoids the "no inline style" hard rule while delivering the same visual result
  - Remote images use `fill` prop + `position: relative` parent rather than explicit `width`/`height` — better for responsive card grids without CLS
  - Greeting computed server-side in `page.tsx` (Server Component), not client-side
- New design tokens used: none beyond what was defined in `docs/DESIGN_SYSTEM.md`
