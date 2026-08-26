# Task: Match Analytics countries map coloring to Explore

Status: done
Track: B
Track reason: visual consistency fix reusing an already-established coloring pattern from Explore — no new design decision.

## Problem
The countries map on the Analytics page is not colored the same way the equivalent map is on `/explore` (e.g. `explore-world-map.done.md` / `explore-city-boundaries-on-country-select.done.md` established a specific coloring scheme there), making the two feel inconsistent.

## Goal
The Analytics countries map uses the same coloring convention (color scale, per-country fill logic, legend style if applicable) as the Explore world map, adapted to whatever metric Analytics is coloring by (e.g. visited count, attractions count — confirm which).

## Requirements
- Compare the color logic/tokens used in Explore's world map component against the Analytics countries map component.
- Align the Analytics map's fill-color function and any legend/tooltip styling with Explore's established pattern (reuse the same color scale/tokens, not a new one).
- Confirm the metric Analytics colors by still makes sense under the reused scale (adjust scale domain/breakpoints for the metric if needed, without inventing a new visual language).

## Constraints
- Reuse Explore's existing color tokens/scale function rather than duplicating or reinventing it — extract to a shared util if that avoids duplication.

## Out of scope
- Changing what metric the Analytics map visualizes.

## Implementation Notes
- Files created/modified: `src/components/CountriesMap/CountriesMap.tsx` — replaced the single-hue (`#0EA5E9` blue, opacity-only) fill scale with Explore's existing categorical palette (`colorForBoundaryIndex` from `src/lib/mapBoundaryColors.ts`), assigning each country a color by its position in the `countries` prop array (same "assign by index" convention Explore's world map already uses). Kept a count-based opacity ramp (`0.35 + (count/maxCount) * 0.45`) so relative attraction counts are still visually legible, unlike Explore's world view which uses fixed opacity — Analytics genuinely needs that intensity signal (it's the point of the map), so this is a deliberate adaptation of the reused convention rather than a 1:1 copy.
- Deviations from brief: none — reused the existing shared palette/function rather than duplicating or reinventing color logic.
- New design tokens used: none.
- Verified: `next build` succeeds; confirmed `CountriesMap` is indeed the component Analytics renders (`AnalyticsClient.tsx` dynamic import) so this single change covers Analytics' countries map.

## Completion Summary
Analytics' countries map now uses the same categorical color palette as Explore's world map (assigned per-country by list position) instead of a single blue intensity scale, while keeping a count-based opacity ramp so the metric it visualizes stays legible. Closed 2026-08-26.
