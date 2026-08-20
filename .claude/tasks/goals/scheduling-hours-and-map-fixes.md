# Goal: Scheduling, Hours & Map Fixes

Status: in progress

Batch of six fixes/enhancements to itinerary scheduling correctness (opening hours, calendar range, auto-placement), trip access control, and the Explore map's pin density at country zoom.

## Tasks
- [x] .claude/tasks/opening-hours-midnight-wraparound-fix.done.md
- [x] .claude/tasks/multi-range-opening-hours.done.md
- [x] .claude/tasks/calendar-auto-range-controls.done.md
- [x] .claude/tasks/attraction-assign-append-to-day.done.md
- [x] .claude/tasks/trip-detail-edit-readonly-toggle.done.md
- [ ] .claude/tasks/explore-map-city-zoom-clustering.md

## Plan
1. **Opening-hours midnight-wraparound fix** — correctness bug in `getClosedAlert`; fix first since it's the most isolated and other hours work builds on the same function.
2. **Multi-range opening hours** — extends the opening-hours data model and the same check function touched in task 1; sequenced right after to avoid rebasing conflicts on `CalendarSection.utils.ts` / `attraction.ts` types.
3. **Calendar auto range controls** — same file (`CalendarSection.tsx`) as tasks 1-2's consumer; removes the manual range selects and makes the day-window fully derived.
4. **Attraction assign — append to day** — also lives in the calendar/scheduling area (`schedule.ts`, `CalendarSection.tsx`); grouped with 3 since both touch day-scheduling defaults.
5. **Trip detail edit/read-only toggle** — independent feature area (`TripDetailClient.tsx` access control), no dependency on 1-4.
6. **Explore map city/zoom clustering** — fully independent area (Explore page), can be built in parallel with anything above.
