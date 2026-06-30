# Task: Analytics Summary Card Drill-Down Detail

Status: done

Track: A
Track reason: new interactive data panel — clicking a stat card reveals supporting data; no existing drill-down pattern; requires API expansion

## Problem
The analytics page shows 5 summary stats (Total Trips, Total Attractions, Users, Countries, Cities) as plain numbers. Users cannot explore what lies behind these numbers — there is no way to see which countries, which cities, or who the top contributors are, without leaving the page.

## Goal
Each stat card is clickable and reveals a compact detail panel (inline below the cards or as a focused side panel) showing the underlying data that composes the number.

## Requirements

### What to show per card

| Card | Detail data |
|---|---|
| Total Trips | Top 10 trips by attraction count (name, owner, attraction count) |
| Total Attractions | Already covered by the category chart — show the top 10 most-added individual types with count |
| Users | Top 10 users by attraction count (name, trip count, attractions count) — already partially in `topUsers` |
| Countries | Top 10 countries by attraction count |
| Cities | Top 10 cities by attraction count |

### Interaction
- Clicking a card: highlights it (primary border/background tint) and opens a detail panel below the stat grid (full width, inside the same card or a new section)
- Clicking the same card again: closes the panel
- Clicking a different card: switches panel content
- Panel has a subtle "× Close" or just collapses when re-clicking the card

### API
The existing `GET /api/analytics/global` endpoint needs to be extended to return:
- `topTrips: Array<{ name: string; ownerId: string; attractionCount: number }>` — top 10 by attractionIds length
- `topTypes: Array<{ _id: string; count: number }>` — already in `categoryDistribution` (individual types), use this directly
- `topCountries: Array<{ _id: string; count: number }>` — top 10 countries by attraction count
- `topCities: Array<{ _id: string; count: number }>` — top 10 cities by attraction count
- `topUsers` is already returned — reuse as-is

### Detail panel layout
- Compact list: number badge + name + count (right-aligned)
- Max 10 rows
- No pagination (top 10 is sufficient)

### Non-functional
- Accessible: selected card has `aria-expanded` + `aria-controls` pointing to the panel
- Panel has `role="region"` with `aria-label` matching the card label
- Responsive: panel full-width below the grid on all screen sizes

## Constraints
- CSS Modules only
- Extend `GlobalAnalytics` TypeScript interface to include the new fields
- MongoDB aggregation for topTrips, topCountries, topCities added to the existing analytics route handler

## Out of scope
- Pagination beyond top 10
- Date filtering
- Per-user trip detail (clicking a user name to see their profile)


## Implementation Notes
- Files modified: `src/app/api/analytics/global/route.ts`, `src/app/analytics/AnalyticsClient.tsx`, `src/app/analytics/AnalyticsClient.module.css`
- Deviations from brief: none
- New design tokens used: none


## Completion Summary
Stat cards converted to buttons; clicking reveals a ranked detail panel (top 10) for each card: trips by attraction count, individual attraction types, users, countries, and cities. API extended with topTrips/topCountries/topCities aggregations. Panel fades in below stats grid, keyboard-navigable. Follow-up tasks created for UX improvements and map visualizations. Confirmed by user 2026-06-30.
