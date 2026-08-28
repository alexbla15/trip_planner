# Goal: Nested attractions (parent/child)

Status: done

Lets an attraction (e.g. a restaurant, a shop) be marked as located inside another attraction (e.g. a mall, a zoo) — child inherits the parent's coordinates/city/country, is independently viewable/searchable/schedulable, but never renders as its own separate map pin.

## Tasks
- [x] .claude/tasks/nested-attractions-data-model.done.md
- [x] .claude/tasks/nested-attractions-create-edit-ui.done.md
- [x] .claude/tasks/nested-attractions-detail-display.done.md
- [x] .claude/tasks/nested-attractions-map-dedup-v2.done.md

## Plan
1. **Data model & backend** — schema field, create/update validation, response shape (parentAttractionId, parent name, child count/list). Everything else depends on this existing first.
2. **Create/edit UI (parent picker)** — the only way parent/child links actually get created; needed before there's any real data to display or dedupe.
3. **Detail display (parent/child badges + drill-through)** — surfaces the relationship on cards once it can exist; independent of the map-dedup work, can run in parallel with task 4 if needed.
4. **Map pin deduplication across all map surfaces** — the actual "no separate pin" requirement; last because it only matters once children can exist, and benefits from task 1's response shape carrying `parentAttractionId` onto every attraction object map surfaces already consume.

## Decisions confirmed with user (2026-08-23)
- ~~Nesting is one level only — a child cannot itself be a parent.~~ **Reversed 2026-08-27** — see `nested-attractions-multi-level.done.md`: nesting now supports arbitrary depth, with cycle prevention (self-parent/descendant-as-parent rejected) instead of a hard depth cap.
- A child keeps its own independent card everywhere (lists/search/grid), tagged "Part of [Parent]" — not hidden inside the parent only.
- A child can be added to a trip itinerary independently of its parent (own scheduled time/duration) — the parent link is for map grouping/browsing context only, not a scheduling dependency.

## Note (2026-08-28)
This goal's task list was stale — item 4 ("map pin deduplication") had been renamed `nested-attractions-map-dedup-v2` and shipped under the separate `trip-analytics-attraction-improvements` goal's batch, alongside the multi-level nesting reversal above. Corrected the checklist to point at the file that actually exists/shipped, and closed this goal as done.
