# Goal: Add an optional Region level between Country and City

Status: in progress

Adds a fourth drill-down level to Explore (Country → Region → City → Attraction), with
Region optional so unset attractions keep behaving exactly like today's Country → City.

## Tasks
- [x] .claude/tasks/attraction-region-data-model.done.md
- [x] .claude/tasks/attraction-region-migration.done.md
- [ ] .claude/tasks/new-attraction-region-field.md
- [ ] .claude/tasks/explore-region-drilldown.md

## Plan
1. **attraction-region-data-model** — add the optional `region` field to the schema/type/
   service/swagger layer first; nothing else can be built on top of a field that doesn't
   exist yet, and this alone is a safe, additive, backward-compatible change.
2. **attraction-region-migration** — once the field exists, propose a country → region →
   city mapping for every city already in the DB, get it approved (per the user's explicit
   ask to verify before moving any attractions), then run the migration. Comes before the UI
   work so the Explore page can be built/tested against real, representative region data
   instead of an empty field.
3. **new-attraction-region-field** — editor support for setting region on new/edited
   attractions, so the region data set stays complete going forward after migration seeds it.
4. **explore-region-drilldown** — the Explore page itself: insert the Region level into the
   world → country → city drill-down (map + grid + filters + URL persistence), last because
   it's the biggest task and benefits from the other three already being in place.
