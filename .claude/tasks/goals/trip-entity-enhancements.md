# Goal: Trip Entity Enhancements

Status: done

Expanding what travelers can record in a trip: richer attraction type categories, dedicated residence entries, and dedicated flight entries.

## Tasks
- [x] .claude/tasks/attraction-type-categories.done.md
- [x] .claude/tasks/special-attraction-residence.done.md
- [x] .claude/tasks/special-attraction-flight.done.md

## Plan
1. **Attraction type categories** — foundation; expands the type list and reorganizes the picker, which both residence and flight will use for their subtype display
2. **Residence entry** — adds the `subtype` discriminator and residence-specific fields to the data model; flight builds on the same pattern
3. **Flight entry** — reuses the subtype pattern from residence; highest-value logistics feature for travelers
