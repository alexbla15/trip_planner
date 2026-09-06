# Task: OpenStreetMap-backed combobox for the Region field

Status: done
Track: B
Track reason: reuses two already-established patterns in this exact codebase (LeafletMapWidget's debounced Nominatim search dropdown, and the plain-text Region field just shipped) — no new visual pattern

## Problem
The Region field in NewAttractionModal is a plain free-text `<input>` with no suggestions —
the user has to already know/guess the exact name a boundary lookup will resolve (as seen
in the boundary-fixing work, several natural-sounding names don't match Nominatim's actual
gazetteer naming). A combobox backed by live OpenStreetMap search results lets the user see
and pick a real, resolvable place name while typing, the same way `LeafletMapWidget`'s
location search already works elsewhere in this same modal.

## Goal
Typing in the Region field shows a debounced dropdown of OpenStreetMap place suggestions
(scoped by the selected country when set); selecting one fills the field with a clean
label. The field stays free text — not selecting a suggestion and just typing/leaving a
value is still valid, since `region` has no fixed value set.

## Requirements
- Debounced (400ms, matching `LeafletMapWidget`/the measure-tool's existing search inputs)
  call to the existing `searchLocation` service on every keystroke once there's a non-empty
  query, appending `, ${country}` to the query when a country is already selected
- Dropdown list of suggestions (`display_name`, trimmed to the first 1–2 comma segments
  for readability, same trim `LeafletMapWidget`/the measure tool already do) — clicking one
  sets `region` to that trimmed label and closes the dropdown
- Escape key and an empty query both close/clear the dropdown, matching the existing
  `LeafletMapWidget`/measure-tool search inputs' behavior
- Still a plain editable text input otherwise — typing and not picking a suggestion, or
  clearing the field, must keep working exactly as today

## Constraints
- Reuse `searchLocation` (`@/services`, already used by `LeafletMapWidget` and the
  Explore measure tool) — no new geocoding endpoint
- Reuse the existing suggestion-dropdown CSS already defined in `MapPicker.module.css`
  (`.suggestions`/`.suggestionItem`/`.searchSpinner` etc.) rather than duplicating a third
  copy of the same dropdown styling (a second copy already exists in
  `ExploreClient.module.css` for the measure tool) — import that module alongside
  `NewAttractionModal.module.css`'s own `styles`

## Out of scope
- Any change to how `region` is submitted/validated (still optional free text)
- Any change to the City field's own `SearchableSelect` (different data source — DB cities,
  not live OSM search — stays as-is)

## Implementation Notes
- Files created/modified: src/components/NewAttractionModal/NewAttractionModal.tsx (imported `searchLocation` and `MapPicker.module.css` styles; new regionSuggestions/regionSearching state + debounce ref; handleRegionChange debounces a searchLocation call scoped by the selected country; handleRegionSuggestionSelect commits a trimmed display_name; Region field JSX now a search-wrapper+dropdown matching LeafletMapWidget's exact pattern, reusing its CSS classes rather than duplicating a third copy)
- Deviations from task requirements: none
- New design tokens used: none — reused MapPicker.module.css's existing search/suggestion styles verbatim
- Verification: tsc clean, eslint clean (0 new issues), live-tested logged in as the demo admin: typing "Black" showed literal street-name matches (Nominatim's own free-text ranking, not a bug), typing the full "Black Forest" correctly surfaced "Black Forest, Baden-Württemberg, Germany" as a clean pickable suggestion

## Completion Summary
Region field is now an OpenStreetMap-backed combobox (debounced search + suggestion dropdown), reusing LeafletMapWidget's exact pattern and CSS. Confirmed by the user 2026-09-06.
