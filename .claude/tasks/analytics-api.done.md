# Task: Analytics API

Status: done

Track: B
Track reason: backend-only route handlers using MongoDB aggregation; no new UI surfaces in this task

## Problem
There is no visibility into platform-wide or personal usage stats. The swagger defines two analytics endpoints that aggregate trip and attraction data.

## Goal
Implement the global and personal analytics API endpoints using MongoDB aggregation pipelines.

## Requirements

### Backend

**GET /api/analytics/global** (public — no auth required)
Returns `GlobalAnalytics`:
- `summary.totalTrips` — count of all Trip documents
- `summary.totalAttractions` — count of all Attraction documents
- `summary.uniqueCitiesCovered` — distinct city values across all Attraction documents
- `summary.uniqueCountriesCovered` — distinct country values across all Trip documents
- `summary.totalPlatformBudget` — sum of `Trip.budget` across all trips
- `categoryDistribution` — array of `{ _id: string, count: number }` grouped by `Attraction.types` (unwind types array, group by type)
- `topUsers` — array of `{ ownerId, attractionsCount, countriesCount }`, top 10 users by attraction count

**GET /api/analytics/summary** (requires auth)
Returns `PersonalAnalytics` for the authenticated user:
- `summary.totalTrips` — count of trips where ownerId = current user
- `summary.totalAttractions` — count of attractions where ownerId = current user
- `summary.uniqueCitiesCovered` — distinct cities across user's attractions
- `summary.uniqueCountriesCovered` — distinct countries across user's trips
- `summary.totalPersonalBudget` — sum of budget across user's trips
- `categoryDistribution` — attraction types distribution for this user

### Swagger reference
- GET /api/analytics/global → GlobalAnalytics (no auth)
- GET /api/analytics/summary → PersonalAnalytics (Bearer required)

## Constraints
- Use MongoDB aggregation pipelines (`$group`, `$count`, `$addToSet`, `$unwind`, `$sum`)
- Global endpoint is public (no auth middleware) per swagger spec (`security: []`)
- All aggregations run on the DB side — no JS-side data processing

## Out of scope
- Analytics dashboard UI (data available via API for future tasks)
- Time-series / per-month breakdowns
- Budget spent tracking (only budget planned)

## Completion Summary
Analytics API confirmed by the user on 2026-06-29. Two Route Handlers created: GET /api/analytics/global (public, platform-wide stats via MongoDB aggregation pipelines) and GET /api/analytics/summary (JWT-protected, personal stats scoped to the authenticated user). All aggregations run in parallel with Promise.all.

## Implementation Notes
- Files created: `src/app/api/analytics/global/route.ts`, `src/app/api/analytics/summary/route.ts`
- Deviations from task requirements: none — all aggregations run server-side via `Promise.all`; `ownerId` cast to `mongoose.Types.ObjectId` before use in aggregation `$match` to ensure type safety with the ObjectId field
- New design tokens used: none (backend only)
