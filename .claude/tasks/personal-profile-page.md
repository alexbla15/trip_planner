# Task: Personal Profile Page

Status: reviewing

Track: A
Track reason: new /profile page combining user info with personal analytics; no existing profile UI pattern

## Problem
Logged-in users have no dedicated place to see their own stats, manage their profile info (name, avatar URL), or understand their travel activity at a glance. The personal summary API (`GET /api/analytics/summary`) exists but is never displayed.

## Goal
A `/profile` page that shows the logged-in user's profile info, editable name/avatar URL, and their personal travel stats from `GET /api/analytics/summary`.

## Requirements

### Route
`/profile` — protected by RouteGuard
Add a "Profile" link to the Navbar avatar dropdown (Lucide `User` icon) next to "Log out"

### Sections

**1 — Profile header**
- Large avatar circle (60px, same gradient style as Navbar avatar but larger) showing user initial
- User name (h1, editable inline — click pencil icon → input → save via PUT /api/users/me)
- Email (read-only, shown below name)
- Joined date (`createdAt` formatted)
- "Edit profile" expands an inline form for `name` and `avatarUrl` (URL input); "Save" calls `PUT /api/users/me`; updates `AuthContext` user on success

**2 — Personal stats cards** (from `GET /api/analytics/summary`)
4-card grid (same stat card pattern as analytics page):
- My Trips → `MapPinned`
- My Attractions → `Landmark`
- Cities Visited → `Building2`
- Countries Visited → `Globe`
- Personal Budget Planned → `DollarSign`

**3 — My Category Breakdown** (from `categoryDistribution` in summary)
Same horizontal CSS bar chart as analytics page, but filtered to this user's attraction types. Title: "My Favourite Attraction Types". Show message "No attractions yet — start planning!" if empty.

**4 — Quick links**
Two action cards:
- "Plan a new trip" → `/new-trip`
- "View my trips" → `/trips`

### Non-functional
- Loading skeleton while fetching
- Error state if API fails
- Accessible: all interactive elements labelled, inline edit has focus management

## Constraints
- CSS Modules only, no inline styles
- Reuse stat card and bar chart CSS patterns from analytics page (or accept some duplication)
- AuthContext must be updated after profile edit so the Navbar name updates immediately

## Implementation Notes
- Files created: `src/app/profile/page.tsx`, `src/app/profile/ProfileClient.tsx`, `src/app/profile/ProfileClient.module.css`
- Files modified: `src/components/Navbar/Navbar.tsx` (User import, profileLink + divider in dropdown, mobile My Profile link), `src/components/Navbar/Navbar.module.css` (`.profileLink`, `.dropdownDivider`)
- Deviations from brief: `login(token)` is called after successful PUT to re-hydrate AuthContext — this triggers a `GET /api/users/me` under the hood, which is why `token` must be available. The profile page reads `authUser` from context (no separate user fetch) since the RouteGuard already ensures the user is loaded.
- New design tokens used: none

## Out of scope
- Avatar image upload (stays as URL string)
- Account deletion
- Password change
- Notification preferences

---

## Design Brief

### File map
```
src/app/profile/
  page.tsx           ← metadata + RouteGuard + <ProfileClient />
  ProfileClient.tsx  ← "use client"
  ProfileClient.module.css
```
Also modify: `src/components/Navbar/Navbar.tsx` + `Navbar.module.css`

---

### Navbar — add Profile link to dropdown

Inside `.dropdown`, add a `<Link>` **above** the logout button, separated by a subtle divider:
```tsx
<Link href="/profile" className={styles.profileLink} role="menuitem" onClick={() => setDropdownOpen(false)}>
  <User size={15} aria-hidden="true" />
  My Profile
</Link>
<div className={styles.dropdownDivider} aria-hidden="true" />
```

New CSS in `Navbar.module.css`:
```css
.profileLink {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 10px 12px; border-radius: var(--radius-md);
  font-size: 14px; font-weight: 500;
  color: var(--color-text-secondary); text-decoration: none;
  transition: background var(--duration-fast) var(--easing-out),
    color var(--duration-fast) var(--easing-out);
}
.profileLink:hover { background: var(--color-bg-subtle); color: var(--color-text-primary); }
.profileLink:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.dropdownDivider { height: 1px; background: var(--color-border-subtle); margin: 4px 0; }
```

Also add to mobile menu above the logout button:
```tsx
<Link href="/profile" className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
  <User size={18} aria-hidden="true" />
  My Profile
</Link>
```

---

### Page shell

`.page` — `min-height: 100dvh; background: var(--color-bg-subtle)`

**Hero** (same pattern as /analytics):
`background: var(--hero-gradient); padding: 48px 0 56px`
Inner (max-width 1280px, padding 0 24px):
- `<h1>` "My Profile" — `font-family: var(--font-plus-jakarta-sans); font-size: clamp(24px, 3vw, 36px); font-weight: 800; color: var(--color-text-primary)`
- `<p>` "Manage your account and view your travel stats." — `font-size: 16px; color: var(--color-text-secondary)`

**Content**: `max-width: 1280px; margin: 0 auto; padding: 40px 24px 80px; display: flex; flex-direction: column; gap: 32px`

---

### Shared card shell
`.card { background: var(--color-surface); border-radius: var(--radius-xl); box-shadow: var(--shadow-md); padding: 28px; }`

---

### Section 1 — Profile header card

`.profileCard { display: flex; gap: 28px; align-items: flex-start; }`
`@media (max-width: 640px) { .profileCard { flex-direction: column; align-items: center; } }`

**Avatar circle** (`.avatarCircle`):
```
width: 80px; height: 80px; border-radius: var(--radius-full); flex-shrink: 0;
background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
display: flex; align-items: center; justify-content: center;
font-family: var(--font-plus-jakarta-sans); font-size: 32px; font-weight: 800;
color: var(--color-text-inverse);
```
Shows `user.name[0].toUpperCase()`.

**Info block** (`flex: 1`):
- Name row (`display: flex; align-items: center; gap: 8px; flex-wrap: wrap`):
  - `<span>` name — `font-family: var(--font-plus-jakarta-sans); font-size: 22px; font-weight: 700; color: var(--color-text-primary)`
  - Edit button (`.editTrigger`): `width: 32px; height: 32px; border: none; background: none; cursor: pointer; border-radius: var(--radius-md); color: var(--color-text-tertiary); display: flex; align-items: center; justify-content: center`; hover: `color: var(--color-primary); background: var(--color-primary-light)`; `aria-label="Edit profile"` + Lucide `PenLine` 16px
- Email: `font-size: 14px; color: var(--color-text-secondary); margin-top: 4px`
- Joined: `font-size: 13px; color: var(--color-text-tertiary); margin-top: 4px` — "Member since {formatDisplayDate(createdAt)}"

**Edit form** (replaces name row when `isEditing === true`):
`display: flex; flex-direction: column; gap: 12px`

Each field: `<label>` (14px, 500, secondary colour, display:block, margin-bottom:4px) + `<input>` (height:44px, padding 0 12px, border 1px solid --color-border, border-radius --radius-md, font-size:14px, width:100%, focus ring: primary border + light box-shadow).
Fields: Display name (type="text") + Avatar image URL (type="url", placeholder "https://…")

Button row (`display: flex; gap: 8px; margin-top: 4px`):
- **Save**: `height: 40px; padding: 0 18px; border-radius: var(--radius-md); background: var(--color-primary); color: var(--color-text-inverse); font-size: 14px; font-weight: 600; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit`; hover: `background: var(--color-primary-dark)`; disabled: `opacity: 0.6`; loading: `Loader2` 14px + "Saving…"; Lucide `Check` 14px default
- **Cancel**: `height: 40px; padding: 0 16px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: transparent; color: var(--color-text-secondary); font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px`; Lucide `X` 14px

API error below buttons: `font-size: 12px; color: var(--color-error); display: flex; align-items: center; gap: 4px` + `AlertCircle` 12px; `role="alert"`

---

### Section 2 — Personal stats cards

Same `.statsGrid` (2col → 3col → 5col) and `.statCard` pattern as /analytics:

| Icon | Label | Field |
|------|-------|-------|
| `MapPinned` | My Trips | `summary.totalTrips` |
| `Landmark` | My Attractions | `summary.totalAttractions` |
| `Building2` | Cities Visited | `summary.uniqueCitiesCovered` |
| `Globe` | Countries Visited | `summary.uniqueCountriesCovered` |
| `DollarSign` | Budget Planned | `summary.totalPersonalBudget` (prefix with `$`) |

---

### Section 3 — My Category Breakdown

Identical SVG donut chart to /analytics — same `TYPE_COLORS`, same `donutSlicePath` math, same legend layout with icons. Data comes from `GET /api/analytics/summary` `categoryDistribution`.

Section heading: `BarChart2` icon + "My Attraction Types"

Empty state (when `categoryDistribution` is empty): centred `BarChart2` icon + "No attractions yet — start planning!" + `<Link href="/new-trip">` styled as a primary ghost button.

---

### Section 4 — Quick links

`.quickLinks { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }`
`@media (max-width: 480px) { .quickLinks { grid-template-columns: 1fr; } }`

Each `<Link>` card (`.quickCard`):
```css
background: var(--color-surface); border-radius: var(--radius-xl); box-shadow: var(--shadow-md); padding: 24px;
display: flex; flex-direction: column; gap: 12px; text-decoration: none; cursor: pointer;
border: 2px solid transparent;
transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
```
Hover: `border-color: var(--color-primary); box-shadow: var(--shadow-card-hover)`

Card interior (bottom row for arrow): `display: flex; align-items: center; gap: 8px; margin-top: auto`
- Icon circle (same `.sectionIconCircle` — 36×36px, primary-light bg)
- Title: `font-family: var(--font-plus-jakarta-sans); font-size: 16px; font-weight: 700; color: var(--color-text-primary)`
- Subtitle: `font-size: 13px; color: var(--color-text-secondary)`
- `ChevronRight` 18px, `color: var(--color-primary); margin-left: auto`

Card 1: `MapPinned` icon, "Plan a New Trip", "Start your next adventure" → `/new-trip`
Card 2: `Map` icon, "My Trips", "Browse all your trips" → `/trips`

---

### Accessibility
- `<h1>` in hero, `<h2>` on each section card
- Edit trigger: `aria-label="Edit profile"`; becomes `aria-label="Cancel editing"` when form is open
- Form: `<label htmlFor>` + `aria-required` on required fields; errors: `role="alert"`
- Quick-link cards: `<Link>` renders as `<a>` — keyboard-navigable natively
