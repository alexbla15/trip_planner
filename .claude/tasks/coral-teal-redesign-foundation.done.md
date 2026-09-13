Status: done
Track: A (design pass, foundation scope)

## Completion Summary
Confirmed by user 2026-09-13.

## Implementation Notes
- `src/app/globals.css`: replaced sky-blue/amber brand tokens with coral
  primary (#e2521f) + teal accent (#0d9488), light and dark variants;
  retinted `--shadow-card-hover`; bumped `--radius-lg`/`--radius-xl` for a
  rounder feel; added `--hover-lift`/`--press-scale` motion tokens and a new
  (currently unused) `--color-overlay` token; two-tone coral-to-teal
  `--hero-gradient` in both themes; closed the pre-existing gap where
  `--color-accent` was never overridden in dark mode.
- `src/components/Navbar/Navbar.module.css`: `.newTripBtn` is now pill-shaped
  (`--radius-full`) with a hover lift + shadow and a press-scale.
- `src/components/NewTripCard/NewTripCard.module.css`: fixed a hardcoded
  old-primary-tinted focus ring to derive from `var(--color-primary)` via
  `color-mix()`.
- `src/app/HomeClient.tsx` + `page.module.css`: added a pill "Plan a new
  trip" CTA in the hero (links to `/new-trip`, reusing the existing route —
  no new state), and added the site's first mobile breakpoint
  (`@media (max-width: 640px)`) for hero/section padding, which previously
  had none.
- Out of scope, untouched: Explore/Trips/New Trip/Login/Register/Profile/
  Admin/Analytics pages, the 13 modal CSS files, AttractionGridCard.
- Verified: `tsc --noEmit` clean. Playwright screenshots (desktop 1440px,
  mobile 390px, light + dark, plus mobile hamburger menu open) via a demo-user
  login, reviewed visually — hero gradient, pill buttons, avatar gradient,
  and mobile menu all read correctly in both themes.

## Request
Redesign the site (desktop + mobile) to feel more modern, young, and inviting.
Scoped to "foundation first": tokens + shared shell (Navbar, Footer) + Home page.
Color direction: warm coral + teal, replacing sky-blue + amber.

## Plan
See approved plan (coral/teal palette in globals.css :root and [data-theme="dark"],
rounder radius/motion tokens, Navbar CTA pill treatment, hero gradient + mobile
breakpoint on Home page, NewTripCard focus-ring fix). Out of scope: Explore,
Trips, New Trip, Login/Register, Profile, Admin, Analytics pages; modal restyle;
Button component extraction; spacing/z-index/type-scale tokens.
