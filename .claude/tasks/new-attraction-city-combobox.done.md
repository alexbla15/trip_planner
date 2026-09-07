# Task: OpenStreetMap-backed combobox for the City field

Status: done
Track: B
Track reason: extends the exact same pattern just shipped for Region to the sibling City field — no new visual pattern

## Problem
City currently uses `SearchableSelect` sourced from `getCities()` — attractions already in
this app's own DB, scoped by country. That only ever suggests places someone has already
added here. Region was just switched to a live OpenStreetMap-backed combobox (debounced
search + suggestions dropdown, free text still accepted); City should work the same way.

## Goal
Typing in the City field shows a debounced dropdown of OpenStreetMap place suggestions
(scoped by the selected country when set), the same combobox behavior Region already has.
Selecting a suggestion fills a clean label; not selecting one and just typing/leaving free
text still works exactly as today.

## Requirements
- Replace City's `SearchableSelect`+`getCities` wiring with the same debounced
  `searchLocation` + dropdown pattern used for Region (and originally `LeafletMapWidget`) —
  reuse `mapPickerStyles`, the same 400ms debounce, the same `display_name` trim-to-2-segments
  suggestion-select behavior
- Still free text: typing a city not found in OSM results, or clearing the field, must
  keep working exactly as today (no forced match required)

## Constraints
- `knownCities`/`getCities()`/`filterCityOptions` become unused by this field once
  converted — check whether anything else in `NewAttractionModal.tsx` still needs them
  (e.g. `cityOptions` memo) before removing; don't leave dead code behind
- Keep the reverse-geocode autofill (`useReverseGeocodeAutofill`, fills city from a dropped
  map pin) working unchanged — it sets `city` state directly, independent of this field's
  own suggestion UI

## Out of scope
- Any change to Country (stays the fixed-list `SearchableSelect`, unrelated) or Region
  (already done)

## Implementation Notes
- Files created/modified:
  - src/components/NewAttractionModal/NewAttractionModal.tsx (removed knownCities/citiesLoading state + getCities-loading effect + cityOptions memo; new citySuggestions/citySearching state + debounce ref; handleCityChange/handleCitySuggestionSelect mirror the Region combobox exactly; City field JSX now the same search-wrapper+dropdown as Region; handleReset clears citySuggestions too; removed now-unused useMemo/getCities/filterCityOptions imports)
  - src/components/NewAttractionModal/NewAttractionModal.utils.ts (removed filterCityOptions — confirmed unused anywhere else in the codebase after this change)
- Deviations from task requirements: none. Bonus: this removed one of the file's 2 pre-existing set-state-in-effect lint errors (the getCities loading effect no longer exists), so lint went from 2 errors to 1, not just "no new issues."
- New design tokens used: none — reused mapPickerStyles, same as Region
- Verification: tsc clean; eslint improved (1 error now vs 2 before, confirmed via git-stash diff); live-verified logged in as the demo admin — typing "Freiburg" with Germany selected correctly surfaces real OSM suggestions ("Freiburg im Breisgau, Baden-Württemberg, Germany")

## Completion Summary
City field converted from a DB-cities-only SearchableSelect to the same OpenStreetMap-backed combobox pattern as Region, with free text still accepted. Removed now-dead getCities/filterCityOptions wiring in the process. Confirmed by the user 2026-09-07.
