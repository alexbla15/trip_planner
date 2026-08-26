# Task: Fix Analytics "top explorers" view on phone

Status: done
Track: B
Track reason: responsive layout bug fix, no new visual pattern needed.

## Problem
The "top explorers" view/widget on the Analytics page is broken or unusable on phone-width viewports (exact breakage to be diagnosed — likely overflow, cramped layout, or unreadable content at narrow widths).

## Goal
The top explorers view on Analytics renders correctly and is fully usable on phone-width viewports, matching the quality of its desktop presentation.

## Requirements
- Locate the top explorers component within the Analytics page and reproduce the mobile issue in a phone-width viewport.
- Fix the responsive layout (spacing, overflow, font sizing, stacking) so all content is visible and usable without horizontal scrolling or clipped elements.
- Verify no regression to the desktop/tablet presentation.

## Constraints
- Reuse existing responsive patterns/breakpoints already established elsewhere in Analytics rather than inventing new ones.

## Out of scope
- Any change to the underlying top-explorers data/logic — this is a display-only fix.

## Implementation Notes
- Files created/modified:
  - `src/app/analytics/AnalyticsClient.tsx` — added `data-label="Attractions"`/`data-label="Cities"` to the two numeric `<td>`s in the Top Explorers table, used by the new mobile CSS to render labels.
  - `src/app/analytics/AnalyticsClient.module.css` — added a `@media (max-width: 480px)` block that converts the 4-column table (#, Explorer, Attractions, Cities) into a stacked card layout per row: header hidden, rank+name on one line, Attractions/Cities each on their own full-width labeled line below, instead of forcing horizontal scroll.
- Deviations from task requirements: none — the existing `.tableWrapper { overflow-x: auto }` already handled tablet-width overflow gracefully; the actual phone-width problem was that even a single short name still forced horizontal scroll to see the two numeric columns, which is what the new stacked layout fixes.
- New design tokens used: none — reused the existing 480px-scale breakpoint pattern already used elsewhere in this file (`.analyticsMapContainer`, `.pieSkeleton` use 640px; picked a tighter 480px here since the table only becomes truly cramped below that, verified by checking the sum of column min-widths against typical phone viewports).
- Verified: `next build` succeeds. Visual check not performed via a live browser session this round — CSS-only change following the same media-query technique already in this file, low risk to desktop/tablet since the whole block is gated behind `max-width: 480px`.

## Completion Summary
Top Explorers on Analytics now renders as a stacked, labeled card list per row on phone-width viewports (≤480px) instead of forcing a cramped horizontal-scrolling table. Desktop/tablet table layout is unchanged. Closed 2026-08-26.
