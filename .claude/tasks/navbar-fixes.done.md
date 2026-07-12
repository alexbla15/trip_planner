# Task: Navbar & Mobile Navigation Fixes

Status: done

Track: B
Track reason: bug fixes and a one-line link change — no new visual surface

## Problem
Three navigation regressions on mobile and desktop:
1. On mobile, the `/admin` option is not visible inside the hamburger menu.
2. On mobile, the panel choices on `/explore` (country/city selector sidebar) are not visible.
3. The "My Trips" link in the top nav bar navigates to the wrong destination instead of `/trips`.

## Goal
All three navigation paths work correctly on every screen size.

## Requirements
- "My Trips" nav link `href` points to `/trips`
- On mobile (hamburger menu open), the `/admin` menu item is rendered and visible
- On `/explore` on mobile, the sidebar panel with view/country/city choices is accessible (scrollable or toggleable)
- No regressions on desktop nav

## Constraints
- CSS Modules only — no inline styles
- No Tailwind

## Out of scope
- Visual redesign of the nav or explore sidebar

## Implementation Notes
- Files created/modified: `src/components/Navbar/Navbar.tsx`, `src/components/Navbar/Navbar.module.css`, `src/app/explore/ExploreClient.module.css`
- Deviations from task requirements: none
- New design tokens used: none

## Completion Summary
Three mobile navigation bugs fixed and confirmed by user. "My Trips" now links to /trips with active highlight; admin "Manager Panel" link appears in the hamburger menu for admin users; the Explore sidebar panel is accessible on mobile via an in-flow bar (Leaflet z-index isolation was the root cause of the floating button being invisible). Closed 2026-07-13.

### Fix details
1. **My Trips link** — replaced `<a href="/#my-trips">` with `<Link href="/trips">` on both desktop and mobile nav; added active highlight via `pathname.startsWith("/trips")`.
2. **Admin in mobile menu** — added `<Link href="/admin">` behind `user.role === "admin"` guard in the hamburger menu (after "My Profile"), matching the desktop dropdown pattern.
3. **Explore sidebar on mobile** — root cause was double: the `.filterToggleBtn` had `z-index: 400` while Leaflet's built-in zoom controls sit at `z-index: 1000`, covering the button; and both were positioned at top-left. Fixed by moving the toggle to `right: 12px` (away from Leaflet's top-left controls) and raising `z-index` to `1100`.
