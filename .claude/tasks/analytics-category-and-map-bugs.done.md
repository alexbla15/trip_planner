# Task: Fix Analytics Category Chart and Country Map Bugs

Status: done

Track: B
Track reason: Bug fixes — broken API aggregation pipeline (no visual change) and wrong data mapping in existing map component (no new UI surface)

## Problem
Two bugs in the analytics page:

1. **Category donut chart shows no data** — `Attraction.types` was migrated from `String[]` to `ObjectId[]` (refs to `AttractionType` documents). The analytics API aggregation does `$unwind "$types"` then `$group by "$types"`, so `_id` is now an ObjectId string. The client-side code does `catTypes.some(t => t.name === _id)` — name vs ObjectId string never matches, so every category shows 0.

2. **One or more countries not highlighted on the map** — `COUNTRY_NAME_ALIASES` in `AnalyticsCountriesMap.tsx` is missing entries for country names that differ between our `COUNTRIES` constants list and the `datasets/geo-countries` GeoJSON feature names.

## Goal
The donut chart shows correct category counts, and all countries with attractions appear highlighted on the world map.

## Requirements
- Fix `src/app/api/analytics/global/route.ts`: add a `$lookup` against `attractiontypes` collection in the `categoryDistribution` aggregation so that `_id` is the type **name** (string), not an ObjectId
- Fix `src/app/analytics/AnalyticsCountriesMap.tsx`: add missing entries to `COUNTRY_NAME_ALIASES` for any country in our `COUNTRIES` list whose stored name differs from the GeoJSON feature name

## Constraints
- CSS Modules only, no inline styles
- No changes to the client-side aggregation logic in `AnalyticsClient.tsx` — the fix belongs in the API

## Out of scope
- Redesigning the chart or map
- Adding new countries to the COUNTRIES list

## Completion Summary
Fixed two analytics page bugs. The category donut chart was broken because migrating `Attraction.types` to ObjectId refs caused the MongoDB aggregation to group by ObjectId strings instead of type names; resolved by adding a `$lookup` against `attractiontypes` in the pipeline. The country map was missing some country highlights due to gaps in the Natural Earth name alias map; added aliases for Cabo Verde, North Macedonia, Eswatini, and Laos. Confirmed working by user on 2026-07-05.

## Implementation Notes
- Files created/modified: `src/app/api/analytics/global/route.ts`, `src/app/analytics/AnalyticsCountriesMap.tsx`
- Deviations from task requirements: none
- New design tokens used: none
