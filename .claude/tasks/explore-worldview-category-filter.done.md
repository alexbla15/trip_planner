Status: done
Track: A (small feature, backend + frontend)

## Completion Summary
Confirmed by user 2026-10-01.

## Request
Allow choosing a category on the Explore page without choosing a country
first (filter the world-view country/city list by category).

## Plan
See approved plan: `/api/attractions/cities` gains an optional `category`
query param (resolved via AttractionCategory -> AttractionType -> type ids,
early $match in the aggregation), getCities() client service threads it
through, ExploreClient's cities-fetch effect sends selectedCategories only
at world view, and the AttractionFilter block becomes view-aware (global
categories list + no types at world view, existing scoped behavior
unchanged at country/city view).

## Implementation Notes
- `src/app/api/attractions/cities/route.ts`: added optional comma-separated
  `category` query param. Resolved via `AttractionCategory.find({name:{$in}})
  .distinct("_id")` then `AttractionType.find({categoryId:{$in}}).distinct
  ("_id")`, added as an early `$match: {types:{$in: typeIds}}` pipeline
  stage (pipeline converted to a mutable array for conditional splicing). A
  category name that resolves to zero types matches nothing (`$match:
  {_id:null}`), not everything, to stay predictable. No param = byte-
  identical pipeline to before.
- `src/services/attractions.service.ts`: `getCities` gained an optional
  `categories?: string[]` param, appended as `?category=<comma-joined>`.
- `src/app/explore/ExploreClient.tsx`: the cities-fetch effect now sends
  `selectedCategories` (only while `!selectedCountry`, since `cities`/
  `countries` aren't read once a country's selected) and depends on
  `selectedCountry`/`selectedCategories`. The `<AttractionFilter>` gate/
  props are now view-aware: world view uses the global `categories` list
  with `types={[]}` (AttractionFilter already hides its type section when
  empty); country/city view unchanged. No other files needed changes —
  `handleCountrySelect` already reset categories on drill-in, URL sync
  already round-tripped `categories` regardless of view, and the "No
  destinations match the selected filters" empty-state copy already covered
  the fully-narrowed case.

## Verification
- `tsc --noEmit`: clean.
- Live via Playwright against `npm run dev`: confirmed the "Category &
  type" filter toggle is visible at world view (previously hidden),
  selecting "Accommodation" hit `GET /api/attractions/cities?category=
  Accommodation` and narrowed the country list from 26 to 12 (and the map
  pins), deselecting restored all 26, and drilling into a country reset the
  category selection (badge gone) as before.
