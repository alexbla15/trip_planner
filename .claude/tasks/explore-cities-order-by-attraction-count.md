# Task: Order cities in Explore by attraction count, then name

Status: intake
Track: B
Track reason: pure sort-order logic change, no visual change.

## Problem
Cities are currently listed in `/explore` (city view/picker) in some other order (e.g. alphabetical only, or insertion order), making it harder to find cities with the most content.

## Goal
Wherever cities are listed in `/explore` (e.g. the country view's city picker/list), they are ordered by number of attractions in that city descending, with ties broken alphabetically by city name.

## Requirements
- Locate the city list/picker logic in `ExploreClient.tsx` (or wherever cities are enumerated for a selected country).
- Sort by attraction count (descending), then by city name (ascending) as a tiebreaker.
- Ensure the count used for sorting matches whatever attraction count is already computed/displayed for each city (don't introduce a second, possibly inconsistent count).

## Constraints
- No API changes should be needed if attraction counts per city are already available client-side; if not, compute them from data already fetched rather than adding a new endpoint.

## Out of scope
- Changing how attraction counts are computed or displayed elsewhere.
