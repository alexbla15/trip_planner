# Task: Analytics Detail Panel Quick Fixes

Status: done

Track: B
Track reason: data + display fixes — no new visual surface; city aggregation update, trip link, users scroll

## Problem
Three issues with the stat card drill-down panel just shipped:
1. **Users** — the panel may not show all 10 users; list needs to be fully visible (scroll if needed)
2. **Cities** — city names are shown without country context, making them ambiguous (e.g. "Springfield")
3. **Trips** — trip rows are plain text; they should link to the trip's detail page

## Goal
The detail panels for Users, Cities, and Trips are more useful and complete.

## Requirements

### 1 — Users: ensure all rows visible
The `.detailPanel` inside `.card` might be too short on smaller screens. The list should be fully visible up to 10 rows. If the card becomes very tall, that is acceptable — do not add a scroll container. Check that no `max-height` or `overflow: hidden` is cutting the list off.

### 2 — Cities: include country in aggregation
Update `topCities` aggregation in `src/app/api/analytics/global/route.ts`:
```ts
Attraction.aggregate([
  {
    $group: {
      _id: "$city",
      count: { $sum: 1 },
      country: { $first: "$country" },  // ← add this
    },
  },
  { $sort: { count: -1 } },
  { $limit: 10 },
]),
```
Update the `GlobalAnalytics.topCities` type to `Array<{ _id: string; count: number; country?: string }>`.

In the detail panel for "Cities Covered", display the city name AND country:
- Name column: `{city}, {country}` (e.g. "Paris, France")
- If country is missing, show just the city name

### 3 — Trips: add _id to aggregation + link
Update `topTrips` aggregation to include `_id`:
```ts
Trip.aggregate([
  {
    $project: {
      name: 1,
      ownerId: 1,
      attractionCount: { $size: { $ifNull: ["$attractionIds", []] } },
      // _id is included by default in $project
    },
  },
  { $sort: { attractionCount: -1 } },
  { $limit: 10 },
]),
```
Update `GlobalAnalytics.topTrips` type to include `_id: string`.

In the detail panel for "Total Trips", wrap each `.detailName` in a `<Link href={"/trips/" + trip._id}>` (import `Link` from `next/link`).

## Constraints
- CSS Modules only
- The `detailRows` useMemo in `AnalyticsClient.tsx` needs updating for topTrips (include `_id`) and topCities (include country)
- Since `detailRows` returns `Array<{ name: string; count: number }>`, either extend that interface to include an optional `href?: string` and `subtitle?: string`, or handle the trips and cities cases separately in the panel JSX

## Out of scope
- "Total Attractions" types do not have individual pages — no links needed there
- Geocoding or maps (separate task)


## Implementation Notes
- Files modified: `src/app/api/analytics/global/route.ts`, `src/app/analytics/AnalyticsClient.tsx`, `src/app/analytics/AnalyticsClient.module.css`
- Deviations from brief: none
- New design tokens used: none


## Completion Summary
Cities detail panel now shows country as a subtitle. Trips detail panel has clickable links to trip pages. topTrips and topCities aggregations updated; GlobalAnalytics interface extended; DetailRow interface added href and subtitle fields. Confirmed by user 2026-06-30.
