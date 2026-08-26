# Task: Match Analytics countries map coloring to Explore

Status: intake
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
