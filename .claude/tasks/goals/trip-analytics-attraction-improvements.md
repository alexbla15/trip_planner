# Goal: Trip/Analytics/Attraction improvement batch

Status: in progress

A batch of 14 fixes and enhancements across Analytics, Explore, Trip detail, and the Attraction data model, requested together on 2026-08-26.

## Tasks
- [ ] .claude/tasks/explore-default-grid-view.md
- [ ] .claude/tasks/trip-detail-default-readonly.md
- [ ] .claude/tasks/trip-edit-button-icon-only.md
- [ ] .claude/tasks/attraction-card-title-wrap-mobile.md
- [ ] .claude/tasks/analytics-top-explorers-mobile-fix.md
- [ ] .claude/tasks/analytics-country-map-coloring-fix.md
- [ ] .claude/tasks/explore-cities-order-by-attraction-count.md
- [ ] .claude/tasks/nested-attractions-multi-level.md
- [ ] .claude/tasks/nested-attractions-map-dedup-v2.md
- [ ] .claude/tasks/analytics-category-picker-search-sort.md
- [ ] .claude/tasks/explore-visited-trips-picker-collapsible.md
- [ ] .claude/tasks/trip-scheduler-mobile-date-picker.md
- [ ] .claude/tasks/attraction-food-styles-multiselect.md
- [ ] .claude/tasks/attraction-multi-price-expenses-tab.md
- [ ] .claude/tasks/explore-map-grid-load-performance.md

## Plan
0. **fix-attraction-detail-modal-null-build-error** (tracked separately, not in this list) — deployment-blocking build error, fixed first, ahead of everything below.
1. **explore-default-grid-view** / **trip-detail-default-readonly** — flip two existing toggles' defaults; trivial, ships immediately.
2. **trip-edit-button-icon-only** / **attraction-card-title-wrap-mobile** — small isolated CSS/markup tweaks, no dependencies.
3. **analytics-top-explorers-mobile-fix** / **analytics-country-map-coloring-fix** — Analytics page responsive/visual fixes, independent of each other.
4. **explore-cities-order-by-attraction-count** — pure sort-order logic change.
5. **nested-attractions-multi-level** — reverses the prior one-level-only decision at the data/validation layer; must land before map-dedup so dedup logic accounts for arbitrary depth, not just one level.
6. **nested-attractions-map-dedup-v2** — finishes the previously-open map-pin-dedup task from the `nested-attractions` goal, updated for arbitrary-depth nesting.
7. **analytics-category-picker-search-sort** — new inline searchable/sortable/paginated category picker, replacing the popup.
8. **explore-visited-trips-picker-collapsible** — new collapsible interaction for the Explore visited/in-my-trips picker.
9. **trip-scheduler-mobile-date-picker** — new mobile date-picker interaction for the trip Calendar/scheduler.
10. **attraction-food-styles-multiselect** — new data model (food styles) + admin management UI + card display + filter; lands before the pricing task since both touch attraction forms/admin and cards, and keeping them sequential avoids merge conflicts in the same files.
11. **attraction-multi-price-expenses-tab** — largest task: multi-price data model on Attraction, plus a new trip-detail expenses tab with cost-option selection and totals; benefits from the attraction-form patterns established by task 10.
12. **explore-map-grid-load-performance** — queued last per user request; not urgent, revisit once the functional batch above is done.
