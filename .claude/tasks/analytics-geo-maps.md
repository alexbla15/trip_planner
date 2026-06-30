# Task: Analytics Geographic Maps — Countries & Cities

Status: done

Track: A
Track reason: new Leaflet map surfaces — world country choropleth and city marker map; no existing pattern for data-driven map in analytics

## Problem
The Countries and Cities drill-down panels show plain ranked lists. Geographic data is much more intuitive to see on a map — users want to visualize where in the world trips and attractions are concentrated.

## Goal
Clicking "Countries" shows a world map with visited countries highlighted; clicking "Cities Covered" shows a map with city markers sized by attraction count.

## Requirements

### Countries panel — world choropleth map
- Replace (or add below) the ranked list with a Leaflet world map
- Countries that appear in `topCountries` are filled with the primary brand color at varying opacity (more attractions = more opaque)
- Countries not in the data remain in a neutral light fill
- Hovering a highlighted country shows a tooltip: country name + count
- Use a world GeoJSON hosted on a public CDN (e.g. `https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson`) — fetched client-side via `useEffect` and cached in state; no bundling of large files
- Map height: 320px desktop, 240px mobile
- SSR safe: use `next/dynamic` with `ssr: false` for the Leaflet component (same pattern as existing `LeafletMapWidget`)

### Cities panel — city marker map
- Requires updating the `topCities` aggregation in the API route to include average lat/lng:
  ```ts
  Attraction.aggregate([
    { $match: { "coordinates.lat": { $exists: true }, "coordinates.lng": { $exists: true } } },
    {
      $group: {
        _id: "$city",
        count: { $sum: 1 },
        country: { $first: "$country" },
        lat: { $avg: "$coordinates.lat" },
        lng: { $avg: "$coordinates.lng" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ])
  ```
- Update `GlobalAnalytics.topCities` type to include `lat?: number; lng?: number; country?: string`
- Render a Leaflet map with circle markers for each city that has coordinates
- Marker radius: proportional to count (e.g. `Math.max(6, Math.log2(count) * 4)`)
- Marker color: `var(--color-primary)` fill, white stroke
- Tooltip: city name + country + count
- Cities without coordinates are listed in the existing text list below the map

### Layout
- Country map replaces the list view (keep ranked list hidden or remove it — map is the primary view)
- City map appears above the ranked list; the ranked list stays as a fallback/supplement

### Non-functional
- Both maps are dynamically imported (ssr: false)
- No new npm packages beyond what's installed (leaflet, react-leaflet)
- Responsive: maps use 100% container width

## Constraints
- CSS Modules only
- Leaflet CSS import inside the dynamically-imported component (same pattern as LeafletMapWidget)
- Coordinate data in the city aggregation comes from existing `Attraction.coordinates` field

## Out of scope
- Drill-down from country → cities on the map
- Map filtering or zooming to a specific country for the cities view
- Real-time data updates

## Implementation Notes
- Files created/modified:
  - `src/app/api/analytics/global/route.ts` — added `lat`/`lng` via `$avg` on `coordinates.lat`/`coordinates.lng` to the `topCities` aggregation
  - `src/app/analytics/AnalyticsCountriesMap.tsx` (new) — Leaflet GeoJSON choropleth, fetches world boundaries client-side, matches `topCountries._id` to `feature.properties.ADMIN` case-insensitively, opacity 0.25–0.8 scaled by count, hover tooltips, gray fill for unmatched countries
  - `src/app/analytics/AnalyticsCitiesMap.tsx` (new) — Leaflet CircleMarker map, radius `4 + (count/maxCount)*14`, bounds fit to city coords with padding, hover tooltips with city/country/count, exports `CityWithCoords` type
  - `src/app/analytics/AnalyticsClient.tsx` — added `next/dynamic` imports for both map components (`ssr: false`), imported `CityWithCoords` type from `AnalyticsCitiesMap`, extended `topCities` type with optional `lat`/`lng`, added `showCountriesMap`/`showCitiesMap`/`mappedCities` computed values, restructured the stat detail panel to render the map above (Countries: map only; Cities Covered: map + existing ranked list below; all other stats: unchanged ranked list)
  - `src/app/analytics/AnalyticsClient.module.css` — added `.analyticsMapContainer` (320px desktop / 240px mobile) and `.mapLoading`
- Deviations from brief: none
- New design tokens used: none (reused `--radius-md`, `--color-border-subtle`, `--color-text-tertiary`)

## Revision Notes (post-review feedback)
User reported: (1) Countries map wasn't highlighting any countries at all, (2) Cities map needed a way to scope to a single country.

- **Bug fix — Countries map not matching:** root cause was `AnalyticsCountriesMap.tsx` reading `feature.properties.ADMIN`, but the `datasets/geo-countries` GeoJSON actually keys the name as `feature.properties.name`. Every lookup silently missed, so every country rendered in the neutral/unmatched gray fill. Fixed both `getStyle` and `onEachFeature` to read `properties.name`. Also added a `COUNTRY_NAME_ALIASES` map to bridge known wording differences between the app's `COUNTRIES` constant (`attraction.constants.ts`) and the GeoJSON's official names (e.g. "United States" → "United States of America", "Czech Republic" → "Czechia", "Congo (Brazzaville/Kinshasa)" → "Republic/Democratic Republic of the Congo", "Tanzania" → "United Republic of Tanzania", "Vatican City" → "Vatican", "Timor-Leste" → "East Timor", "Micronesia" → "Federated States of Micronesia", "São Tomé and Príncipe" accent variant).
- **Feature — Cities map country filter:** Added a country `<select>` dropdown above the cities map (reuses the `.filterSelect` visual pattern from `AttractionPickerModal`, new classes `.citySelect`/`.citySelectWrapper`/`.citySelectIcon` in `AnalyticsClient.module.css`). Defaults to "All countries" (global top cities, capped to 20 for map readability); selecting a country filters `mappedCities` to that country only. Filter resets to "All" whenever a different stat card is opened (`selectStat` helper).
- **API change:** `src/app/api/analytics/global/route.ts` — removed the `$limit: 10` on the `topCities` aggregation so the client has the full city list to filter/group by country (dataset is small-scale; acceptable for this app's analytics use case).
- Files modified: `AnalyticsCountriesMap.tsx`, `AnalyticsClient.tsx`, `AnalyticsClient.module.css`, `src/app/api/analytics/global/route.ts`
- Verified: `tsc --noEmit` and `eslint` clean (pre-existing unrelated warnings in `AnalyticsClient.tsx` untouched). Confirmed via direct API call that `topCities` now returns unbounded list with country field. Manual browser click-through was not performed (no browser automation tool available in this environment) — recommend the user verify visually in `/analytics`.
