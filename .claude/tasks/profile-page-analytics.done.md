# Task: Profile Page — Personal Analytics Cards

Status: done

Track: A
Track reason: new UI surface — stat cards and charts scoped to the current user, mirroring the analytics page pattern

## Problem
The `/profile` page currently shows basic account info but no meaningful trip/attraction statistics for the logged-in user. The analytics page shows global stats; users want a personal view of their own data.

## Goal
The profile page includes a personal analytics section with stat cards and charts specific to the current user's trips and attractions.

## Requirements
- Display personal stat cards: total trips, total attractions scheduled, total countries visited, total spend (in user's preferred currency)
- Mirror the visual card pattern from the analytics page (same card shell, icon circle, number, label)
- At minimum: trips by mood tag (bar or donut), top cities visited (list or small map), attractions by type (donut)
- Data is fetched from existing analytics API endpoints filtered by the current user's `ownerId`, OR from a new lightweight `/api/users/me/stats` endpoint if the existing endpoints don't support user scoping
- Accessible to the logged-in user only — unauthenticated users see a prompt to log in

## Constraints
- CSS Modules only — no inline styles
- Reuse analytics card and chart components where possible — do not duplicate CSS
- Charts: recharts (already used in analytics page)

## Out of scope
- Admin-level views of other users' profiles
- Editing profile info from this section

## Implementation Notes
- Files created: `src/components/CategoryDonutChart/CategoryDonutChart.tsx`, `src/components/CategoryDonutChart/CategoryDonutChart.module.css`
- Files modified: `src/app/api/analytics/summary/route.ts`, `src/app/profile/ProfileClient.tsx`, `src/app/profile/ProfileClient.module.css`, `src/app/analytics/AnalyticsClient.tsx`, `src/components/index.ts`, `swagger.yaml`
- Deviations from task requirements: stat cards are clickable buttons with drill-down panel (matching analytics page); "My Attraction Types" renamed to "Attractions by Category" using parent-category aggregation; quick links and top-cities standalone card removed per user revision
- New design tokens used: none
- **Shared component**: `CategoryDonutChart` extracted so analytics and profile pages render the identical donut chart + drill-down sub-chart from one source
- **API additions**: `topTrips` (by attractionCount) and `topCountries` (by trip count) added to `/api/analytics/summary`
- **Stat card drill-down**: 4 clickable stat cards (My Trips, My Attractions, Cities Visited, Countries) expand a detail panel below; Budget Planned is non-interactive
- **Mood distribution**: horizontal bar chart with `--bar-width`/`--bar-color` CSS custom properties

## Completion Summary
Profile analytics section rebuilt to mirror the analytics page: clickable stat cards with drill-down panels, Attractions by Category donut chart with sub-chart drill-down (extracted into a shared CategoryDonutChart component also used by /analytics), mood tag bar chart, and API extended with topTrips/topCountries. Quick links and standalone top-cities card removed per user request.
