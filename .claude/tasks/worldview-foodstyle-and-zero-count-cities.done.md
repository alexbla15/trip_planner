Status: done
Track: B

## Request
1. Extend the world-view category filter to also support food style (follow-up
   on "selecting Dining at world view should allow restaurant types and/or
   other applicable dining options").
2. "Cities appear with 0 attraction upon explore when choosing specific
   filters (like verified, germany, religious)."

## Part 1 — World-view food style filter
`src/app/api/attractions/cities/route.ts`: added an optional `foodStyle`
query param (resolved directly via `FoodStyle.find({name:{$in}}).distinct
("_id")`, FoodStyle names are globally unique), ANDed with category/type as
another conditional `$match` stage.
`src/services/attractions.service.ts`: `getCities` gained a `foodStyles?:
string[]` param.
`src/app/explore/ExploreClient.tsx`: added `useFoodStyles()` hook, a
`worldViewFoodStyles` memo (global food style list, same "Dining selected"
gate as `availableFoodStyles`), wired into the Food style filter block and
the cities-fetch effect (world view only, same pattern as category/type).

## Part 2 — zero-attraction cities
Root cause: once a country is selected, the city/region list within it
(`citiesInCountry`/`regionsInCountry`/`citiesInRegion`) never excluded
zero-count entries, unlike the top-level world-view country list
(`visibleCities`, which already filters `combinedCount(c) > 0`). This was
a pre-existing gap, but went unnoticed until the new world-view category/
type filter feature made it easy to reach a narrow filter combination
(e.g. Culture + Religious) where several cities in a country genuinely
have zero matches — those showed up as a confusing "City Name — 0" pill
instead of being hidden.

Fix: `src/app/explore/ExploreClient.tsx` — the country-view city list, the
country-view region list, and the region-view city list now all filter out
entries where their respective count function (`cityCountFor`/
`regionCountFor`/`cityCountForInRegion`) returns 0, matching the existing
`visibleCities` precedent.

## Implementation Notes
- `tsc --noEmit`: clean.
- Verified live via Playwright: world-view food style toggle visible under
  Dining, chips render (list of ~60 real food styles). Zero-count fix
  verified by reproducing Culture+Religious+Verified at world view, drilling
  into Germany, and confirming the previously-visible 0-count cities
  (Ludwigsburg, Stuttgart) no longer appear in the city list.
- Also confirmed (not a bug): a sufficiently rare category+food-style combo
  can legitimately return 0 matching countries at world view — correctly
  shows the existing "No destinations match the selected filters" empty
  state, consistent with how visitedFilter/verifiedFilter already behave.
