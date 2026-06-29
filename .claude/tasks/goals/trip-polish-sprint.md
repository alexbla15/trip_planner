# Goal: Trip Planning Polish Sprint

Status: done

Fixing bugs and refining the trip detail + calendar experience based on user feedback after the calendar wizard shipped.

## Tasks
- [x] .claude/tasks/attraction-form-missing-fields.done.md
- [x] .claude/tasks/calendar-edit-loses-date.done.md
- [x] .claude/tasks/budget-currency-symbol.done.md
- [x] .claude/tasks/calendar-card-borders.done.md
- [x] .claude/tasks/trip-mood-tag-updates.done.md
- [x] .claude/tasks/attractions-pagination.done.md
- [x] .claude/tasks/explore-filter-chips-wrap.done.md
- [x] .claude/tasks/explore-card-all-tags.done.md

## Plan
1. **Fix attraction form missing fields** — critical data loss bug; fast and isolated to one route file
2. **Fix calendar-edit losing date** — bad UX bug; single state-management fix in TripDetailClient
3. **Budget currency symbol** — display fix, easy win; requires a tiny new util file
4. **Calendar card borders** — visual polish; CSS-only change
5. **Trip mood tag updates** — content change touching constants, CSS, and forms; wider surface but no logic
6. **Attractions pagination** — new feature (Track A); goes through designer first, biggest scope
