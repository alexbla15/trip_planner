# Goal: Nested attractions (parent/child)

Status: in progress

Lets an attraction (e.g. a restaurant, a shop) be marked as located inside another attraction (e.g. a mall, a zoo) — child inherits the parent's coordinates/city/country, is independently viewable/searchable/schedulable, but never renders as its own separate map pin.

## Tasks
- [ ] .claude/tasks/nested-attractions-data-model.md
- [ ] .claude/tasks/nested-attractions-create-edit-ui.md
- [ ] .claude/tasks/nested-attractions-detail-display.md
- [ ] .claude/tasks/nested-attractions-map-dedup.md

## Plan
1. **Data model & backend** — schema field, create/update validation, response shape (parentAttractionId, parent name, child count/list). Everything else depends on this existing first.
2. **Create/edit UI (parent picker)** — the only way parent/child links actually get created; needed before there's any real data to display or dedupe.
3. **Detail display (parent/child badges + drill-through)** — surfaces the relationship on cards once it can exist; independent of the map-dedup work, can run in parallel with task 4 if needed.
4. **Map pin deduplication across all map surfaces** — the actual "no separate pin" requirement; last because it only matters once children can exist, and benefits from task 1's response shape carrying `parentAttractionId` onto every attraction object map surfaces already consume.

## Decisions confirmed with user (2026-08-23)
- Nesting is one level only — a child cannot itself be a parent.
- A child keeps its own independent card everywhere (lists/search/grid), tagged "Part of [Parent]" — not hidden inside the parent only.
- A child can be added to a trip itinerary independently of its parent (own scheduled time/duration) — the parent link is for map grouping/browsing context only, not a scheduling dependency.
