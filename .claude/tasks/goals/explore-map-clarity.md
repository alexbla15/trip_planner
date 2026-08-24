# Goal: Explore map pin clarity

Status: done

Declutter Explore's map — both the world view (redundant per-country pins on top of the already-colored country borders) and the country view (city pins overlapping/stacking when cities are geographically close, e.g. Germany near Munich).

## Tasks
- [x] .claude/tasks/explore-remove-world-country-pins.done.md
- [x] .claude/tasks/explore-country-view-pin-clustering.done.md

## Plan
1. **Remove world-view country pins** — small, well-scoped removal (the colored boundary/circle already carries the same info + tooltip); no design decision needed, ships first.
2. **Country-view city-pin clustering/decluttering** — needs a design direction picked (clustering vs. threshold vs. spiderfy) before implementation; larger, more visible interaction change.
