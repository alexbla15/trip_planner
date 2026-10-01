Status: done
Track: B

## Completion Summary
Confirmed by user 2026-10-01.

## Request
Explore page gets stuck when several filter sections are expanded (Category
& type + Food style) — can't scroll down to see the rest of the options or
the countries/cities list.

## Problem
`.sidebar` (ExploreClient.module.css) split into two regions: `.sidebarHeader`
(fixed, flex-shrink:0 — held the search bar and all filter toggles) and
`.sidebarScrollArea` (the only scrollable region, holding the world/country/
city list). When the filter toggles alone grew taller than the sidebar's
available height (e.g. Category & type expanded with many chips, plus Food
style also open), the fixed header region had nowhere to go — `.sidebar`
itself had `overflow: hidden`, so the excess was clipped with no way to
reach it, and `.sidebarScrollArea` below got squeezed to zero height.

## Fix
`src/app/explore/ExploreClient.module.css`: `.sidebar` is now the scroll
container itself (`overflow-y: auto` instead of `overflow: hidden`);
`.sidebarScrollArea` is no longer a separate nested scroll region (dropped
its own `overflow-y`/`overflow-x`), just a plain flex child in the same
scroll flow as the header. No JS/markup changes needed (confirmed
`.sidebarScrollArea` has no ref or scroll-position logic depending on it).

## Implementation Notes
- `tsc --noEmit`: clean (CSS-only).
- Verified live via Playwright on a short mobile viewport (430x700):
  reproduced the scenario (Category & type expanded with "Dining" selected,
  which also reveals Food style), confirmed the sidebar now scrolls freely
  and reaches the full countries list below the filters.
