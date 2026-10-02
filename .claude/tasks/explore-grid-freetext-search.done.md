Status: done
Track: B

## Request
Add free text search for grid view of attractions.

## Implementation
`src/app/explore/ExploreClient.tsx`: new `gridSearchQuery` state, a search
input rendered at the top of `.gridArea` (grid view only), and a new
`gridAttractions` derivation that narrows the existing chip-filtered list
(`filteredAttractions`/`filteredRegionAttractions`/`filteredCountryAttractions`)
by case-insensitive substring match on `a.name`. Client-side only, no
debounce needed (list is already bounded to a country/region/city, never
the whole world). Resets to page 1 on query change (added to the existing
grid-page-reset effect) and clears itself when the country/region/city
scope changes (new effect), so a query typed in one city doesn't silently
carry over into another.
`src/app/explore/ExploreClient.module.css`: new `.gridSearchWrapper`/
`.gridSearchIcon`/`.gridSearchInput`, modeled on the existing
`.measureSearchWrapper`/`.measureSearchInput` pattern in the same file.

## Implementation Notes
- `tsc --noEmit`: clean.
- Verified live via Playwright against Germany's 785-attraction grid:
  confirmed the search input is visible, searching "museum" narrows to
  exactly the matching cards (independently verified every rendered card's
  name actually contains "museum", not just coincidental page overlap), a
  nonsense query shows the existing "No attractions match..." empty state,
  and clearing restores the full list.

## Completion Summary
Added a free-text search box to the Explore grid view, filtering the
currently-scoped attraction list by name. Confirmed by user 2026-10-02.
