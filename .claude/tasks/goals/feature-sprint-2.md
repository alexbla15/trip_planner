# Goal: Feature Sprint 2

Status: in progress

Second wave of product features: attraction editing, smarter attraction adding, explore from real DB data, analytics & profile pages, and the trip calendar planner.

## Tasks
- [x] .claude/tasks/attraction-country-default.done.md
- [x] .claude/tasks/explore-from-db.done.md
- [x] .claude/tasks/attraction-editing.done.md
- [x] .claude/tasks/existing-attractions-picker.done.md
- [ ] .claude/tasks/analytics-page.md
- [ ] .claude/tasks/personal-profile-page.md
- [ ] .claude/tasks/trip-calendar-wizard.md

## Plan
1. **attraction-country-default** — Track B, 10-min fix; unblocks existing-attractions-picker which also needs the locked country
2. **explore-from-db** — Track B, data wiring only; no design work, quick win
3. **attraction-editing** — Track A; extends the trip detail page with an in-place edit flow for each attraction
4. **existing-attractions-picker** — Track A; new search-and-add UI before the manual form; depends on country-default being done
5. **analytics-page** — Track A; standalone new page, no dependencies
6. **personal-profile-page** — Track A; standalone new page, no dependencies
7. **trip-calendar-wizard** — Track A; most complex feature, touches trips + attractions + dates; saved for last so all foundation is solid
