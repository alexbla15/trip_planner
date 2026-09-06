# Task: City/region pill counts don't respect category/type/foodStyle filters

Status: done
Track: B
Track reason: bug fix — broken behavior (wrong number displayed), no new UI surface

## Problem
Reported: with a Verified filter active, the country-view header showed "3 of 87
attractions" but the "Zakopane" city pill showed "4" — inconsistent. Root cause: city/
region pill counts (`countFor`, and `RegionEntry.count` derived from it) come from the
`cities` aggregate's precomputed visited×usedInTrip×verified bucket matrix
(`src/app/api/attractions/cities/route.ts`), which has no dimension for category/type/
foodStyle. The header's "X of Y attractions" line, by contrast, is computed from the real
`countryAttractions` list filtered by `matchesChipFilters` (category/type/foodStyle) *and*
visited/tripUsage/verified — so once a category/type/foodStyle filter is active alongside
a bucket-covered one, pill counts and the header total diverge (pills overstate, since they
ignore the chip filters).

## Goal
City/region pill counts always match what's actually shown for that city/region under every
currently-active filter, including category/type/foodStyle — no more mismatch with the
header total.

## Requirements
- Once `countryAttractions` has loaded, derive city/region pill counts from the same
  already-filtered `filteredCountryAttractions`/`filteredRegionAttractions` lists (grouped
  by `city`/`region`), not from the bucket aggregate — same source of truth the header
  total and the grid/map already use
- Before `countryAttractions` has loaded (fast first paint from the `cities` aggregate
  alone), keep using the existing bucket-based `countFor` as a reasonable instant estimate
  — don't regress the fast-first-paint behavior by showing 0 for everyone during the load
  window
- Applies to: country view's "Regions" pills, country view's "Cities" pills, region view's
  "Cities" pills

## Constraints
- World view's "Countries" pills are unaffected — category/type/foodStyle filters are
  never offered there (no country selected yet means no attraction data loaded to derive
  available categories/types from), so the bucket-based count is already always correct
  there
- Don't change the `cities` aggregate/API — this is a client-side count-source fix, not a
  new aggregation dimension

## Out of scope
- Making a city/region pill disappear entirely when its true chip-filtered count is 0 —
  visibility stays governed by the existing bucket-based (visited/tripUsage/verified)
  filtering; only the displayed number changes. A pill can now legitimately show "0" if a
  category/type filter excludes everything in it.

## Implementation Notes
- Files created/modified: src/app/explore/ExploreClient.tsx (new cityAttractionCounts/regionAttractionCounts/cityAttractionCountsInRegion maps derived from filteredCountryAttractions/filteredRegionAttractions; new cityCountFor/regionCountFor/cityCountForInRegion helpers, falling back to the bucket-based countFor/region.count estimate only until countryAttractions loads; country-view Regions pills, country-view Cities pills, and region-view Cities pills all switched from countFor(c)/r.count to these new helpers)
- Deviations from task requirements: none
- New design tokens used: none
- Verification: tsc clean; eslint identical to pre-change baseline (17 problems both before and after, confirmed via git-stash diff); live-verified the actual before/after with a Playwright script selecting a real category filter (Culture) on Poland — before the fix, pills summed to 87 while the header said "33 of 87" (the exact reported mismatch); after the fix, pills sum to exactly 33, matching the header

## Completion Summary
Fixed city/region pill counts to derive from the same filtered attraction lists as the header/grid instead of the visited/usedInTrip/verified-only bucket aggregate, eliminating the mismatch when category/type/foodStyle filters are active. Verified with a real before/after reproduction. Confirmed by the user 2026-09-06.
