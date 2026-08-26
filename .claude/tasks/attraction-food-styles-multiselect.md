# Task: Multi-select food styles for restaurant attractions

Status: intake
Track: A
Track reason: new data model field (multi-select tags) plus new admin-management UI, new card display treatment, and a new filter dimension — no existing pattern covers configurable multi-select tag sets end-to-end.

## Problem
When an attraction's type is "restaurant" (or dining-related), there's no way to describe its food style(s) (fast food, Indian, sushi, Italian, etc.). This information can't be set on the attraction, isn't shown on its card, isn't manageable by admins, and can't be used to filter attractions.

## Goal
A restaurant/dining attraction can have one or more food styles selected from an admin-managed list; the selected styles are editable when creating/editing the attraction, visible on its card, and usable as a filter dimension whenever filtering attractions by category with "dining" selected.

## Requirements
- **Admin management**: add a food-styles list to `/admin` (same pattern as existing admin-managed lists — check how attraction types/travel moods are managed there, e.g. `admin-travel-moods-colors.done.md` / `admin-type-color-and-collapse.done.md`) — admins can add, edit (rename), and remove food style options.
- **Data model**: add a `foodStyles?: string[]` (or ref-based, matching whatever pattern the admin-managed list above uses) field on `Attraction`, only meaningful when the attraction's type/category is dining-related.
- **Create/edit UI**: in `NewAttractionModal`/edit flow, when the attraction's type is restaurant/dining, show a multi-select control populated from the admin-managed food-styles list.
- **Card display**: show selected food style(s) on the attraction card (grid card, detail modal, trip list rows) wherever other type/tag chips already render — reuse the existing chip pattern (see `consolidate-attraction-card-chips.done.md`).
- **Filtering**: when filtering attractions by category and "dining" is the selected category, expose food style as an additional filter (multi-select), following the existing category filter component's pattern (`attraction-filter-component.done.md`).
- Update `swagger.yaml` for the new field and any new admin endpoint(s).

## Constraints
- Reuse whichever existing "admin-managed tag list" pattern is closest (travel moods, or attraction type categories) rather than inventing a new admin CRUD pattern.
- Food styles should only appear/apply for dining-type attractions — don't show the control or filter for non-dining types.
- Renaming/removing a food style option in admin should be reflected consistently on attractions already using it (same convention as however the existing admin-managed lists handle renames — check and match).

## Out of scope
- Food style icons/colors (unless the reused admin pattern already includes color, in which case keep it for consistency — don't add net-new visual complexity beyond what's reused).
- Multi-cuisine analytics/reporting.
