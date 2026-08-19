# Goal: Attraction type filter everywhere

Status: in progress

Bring the multi-select attraction type/category filter that already exists in Explore → City view to every other place attractions are listed.

## Tasks
- [x] .claude/tasks/attraction-filter-shared-type-support.done.md
- [x] .claude/tasks/explore-country-type-filter.done.md
- [x] .claude/tasks/trip-details-attraction-type-filter.done.md
- [x] .claude/tasks/attraction-search-modal-type-filter.done.md
- [ ] .claude/tasks/attraction-picker-modal-type-filter.md

## Plan
1. attraction-filter-shared-type-support — extract the multi-select category+type chip logic currently living inline in Explore → City view (`ExploreClient.tsx`) into the shared `AttractionFilter` component, so every other task can adopt it instead of reimplementing chips. Must land first; everything else depends on it.
2. explore-country-type-filter — Country view currently has no type filter at all (only visited/unvisited); wire the upgraded shared component in.
3. trip-details-attraction-type-filter — Trip Details attractions tab already uses `AttractionFilter` (category-only, single-select); upgrade its usage to the new multi-select type filter.
4. attraction-search-modal-type-filter — same upgrade as #3, for the "add attraction to trip" search modal, which also already uses `AttractionFilter`.
5. attraction-picker-modal-type-filter — Attraction Picker Modal (New Trip flow) has no category/type filter today (only search/country/city); add the shared component.
