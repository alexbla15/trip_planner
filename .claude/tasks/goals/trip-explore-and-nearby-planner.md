# Goal: Trip Explore Tab & Nearby Planner

Status: done

Adds a map-based "Explore" tab inside a trip (filterable by date/type/category) and a suggestion tool that finds nearby attractions within a chosen drive time of a picked attraction and offers to add them to the trip.

## Tasks
- [x] .claude/tasks/trip-explore-tab-with-filters.done.md
- [x] .claude/tasks/trip-nearby-attraction-planner.done.md

## Plan
1. **Trip Explore tab with filters** — the map surface and filter UI must exist first; the planner tool is launched from within it and reuses its filtering.
2. **Nearby attraction planner** — builds on task 1's map/filter UI and its "pick one attraction" interaction; adds the drive-time radius suggestion popup and the add-to-trip flow.
