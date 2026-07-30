# Task: Fix "Georgia" Resolving to the US State Instead of the Country on the World Map

Status: done

Track: B
Track reason: Bug fix — wrong data returned by an existing query, no UI/visual change.

## Problem
When a trip's country is "Georgia" (the country in Europe/Caucasus), the world map (`CountriesMap`, backed by `GET /api/geo/country`) instead highlights Georgia, USA — the American state. `src/app/api/geo/country/route.ts` queries OpenStreetMap Nominatim with a bare text search (`q=Georgia&format=geojson&polygon_geojson=1&limit=5`) and picks the first result whose geometry is a `Polygon`/`MultiPolygon`, with no disambiguation between a sovereign country and a same-named subnational region — Nominatim's free-text ranking can surface the US state ahead of the country for a query this ambiguous.

## Goal
Trips whose `country` field is "Georgia" (or any other country name that collides with a same-named US state/region — e.g. potential future collisions) are mapped to the correct sovereign country, not a same-named subnational region.

## Requirements
- Restrict the Nominatim query in `GET /api/geo/country` to country-level results — Nominatim supports a `featureType=country` query parameter for exactly this purpose. Add it to the request URL.
- Re-verify the fix specifically for "Georgia" (the reported case) against the live Nominatim API, not just by reading the code — confirm the returned polygon is the country, not the US state.
- Check whether the existing per-country `Map` cache (`cache.set(country, polygon)`, module-scope, no TTL/expiry) has already cached a wrong "Georgia" → US-state result during prior use — if so, the fix alone won't correct already-cached wrong data until the server process restarts. Confirm whether this matters for the current deployment (dev server picks up the code change but keeps the old in-memory cache until restarted).

## Constraints
- Don't change the caching strategy itself (module-level `Map`, `next: { revalidate: 86400 }`) — only the query parameters need to change.
- Verify no other country name in current trip data is a similarly-named US state (e.g. "Georgia" is the known case; double check there isn't a second one already in the DB) so this fix doesn't need a second pass immediately after.

## Out of scope
- General Nominatim query-quality improvements beyond the country/region disambiguation (e.g. handling countries with multiple valid English names)
- Adding a manual country-name → ISO-code mapping layer (a heavier fix than needed for this specific ambiguity)

## Implementation Notes
- Files modified: `src/app/api/geo/country/route.ts` (added `&featureType=country` to the Nominatim query URL)
- Deviations from requirements: none
- **Verified live against the real Nominatim API, not just by reading the code** — confirmed the exact bug first: a bare query for "Georgia" (no `featureType`) returns "Georgia, United States" as the *first* result (which the old code picked), with the actual country second. Adding `featureType=country` returns only the country ("საქართველო" — Georgian for "Georgia"), correctly excluding the US state entirely. Re-verified through the app's own running `GET /api/geo/country?name=Georgia` endpoint, which now returns the country polygon.
- Checked current trip data directly in MongoDB for other US-state-name collisions: the only countries currently in use are Czech Republic, Georgia, Hungary, Iceland, and United Kingdom — Georgia is the only one that collides with a US state name, so no second fix is needed right now.
- Cache staleness check: the module-scope `Map` cache in this route was empty for "Georgia" at the time of this fix (no prior request had cached the wrong US-state polygon during this session), so no cache-clearing/restart was needed for this specific case. Worth noting for the future: since the cache has no TTL, any country that *had* already been queried and cached with a wrong result before a similar fix would need a process restart (or a cache-clearing mechanism) to pick up the corrected value — the 24-hour `revalidate` only applies to the underlying `fetch`, not this in-memory `Map`.
- `tsc --noEmit` and `eslint` both clean, zero findings.

