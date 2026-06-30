# Task: Analytics Geographic Maps — Countries & Cities

Status: intake

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
