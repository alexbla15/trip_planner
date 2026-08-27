# Task: Multi-select food styles for restaurant attractions

Status: done
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

## Implementation Notes
- Modeled `foodStyles` the same way `types` already works (reference by ObjectId, resolved to name strings at read time), not the mood-tag pattern (name snapshot) — this way renaming/deleting a food style in admin is reflected on every attraction automatically, with no propagation step needed. Deleting a food style also `$pull`s it from every referencing attraction, mirroring `attraction-types/[id]` DELETE's existing convention.
- Per an explicit prior user correction on a sibling task (`consolidate-attraction-card-chips.done.md`: "the grid tile gets no chip representation at all"), food style chips render only in `AttractionDetailModal`'s existing Types/status chip row — not on `AttractionGridCard` — deviating from this task's own generic wording ("grid card, detail modal, trip list rows") in favor of the more specific, already-established product decision.
- Files created/modified:
  - `src/models/FoodStyle.ts` (new) — minimal `{name}` model, no icon/color (per task scope).
  - `src/app/api/food-styles/route.ts` (new) — GET (public) / POST (admin).
  - `src/app/api/food-styles/[id]/route.ts` (new) — PUT rename (admin) / DELETE + `$pull` from attractions (admin).
  - `src/models/Attraction.ts` — added `foodStyles?: Types.ObjectId[]` (schema ref "FoodStyle"); `formatAttraction` resolves populated docs to name strings, filtering out unpopulated/dangling refs (never renders a raw id or "null").
  - `src/types/attraction.ts` — `foodStyles?: string[]` on the shared `Attraction` shape.
  - `src/lib/services/attractions.service.ts` — every existing `.populate("types")` call site now also populates `foodStyles`; `createAttraction`/`updateAttraction` resolve `foodStyles` name arrays to ids the same way `types` already does.
  - `src/services/foodStyles.service.ts` + `src/services/index.ts` (new/updated) — fetch/create/update/delete client calls, mirroring `moodTags.service.ts`.
  - `src/hooks/useFoodStyles.ts` + `src/hooks/index.ts` (new/updated) — cached list hook with cross-component invalidation, mirroring `useMoodTags.ts` (minus the color-style helper, since food styles have none).
  - `src/lib/adminForms.ts` + `src/lib/index.ts` — `FoodStyleFormState`/`foodStyleFormFromRecord` (name-only form state).
  - `src/app/admin/AdminClient.tsx` — new "Food Styles" `SectionCard` (add/rename/delete via the shared `AdminEntityForm` shell), reusing `.typesList`/`.typeRow`/`.typeItem`/`.typeName`/`.iconBtn`/`.confirmDelete` admin-list styles already used by Attraction Types — no new CSS needed since there's no icon/color to lay out.
  - `src/components/NewAttractionModal/NewAttractionModal.tsx` + `.module.css`, `attraction.types.ts` — `isDining` derived from `findType(t)?.category` on the selected types (case-insensitive "dining" match, not a hardcoded type list); a multi-select chip control (new `.foodStyleChip`/`.foodStyleChips` styles, matching `AttractionTypePicker`'s existing chip shape/tokens) appears only when `isDining`; submits `foodStyles: []` when not dining, so switching a restaurant to a non-dining type clears stale selections.
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` — food style chips render in the existing Types/status chip row, each with a `UtensilsCrossed` icon to visually distinguish from type chips.
  - `src/app/explore/ExploreClient.tsx` + `.module.css` — `selectedFoodStyles` filter state; `matchesChipFilters` gained a `passFoodStyle` check; `availableFoodStyles` (scoped to attractions actually in view) only computed/shown once "Dining" is among `selectedCategories`; rendered as a third collapsible chip section (reusing the same `.chipFilterToggle`/`.chipFilterCollapse` pattern already established for "Visited & trip status" and "Category & type"), positioned right after the category/type filter. Deselecting "Dining" clears any selected food styles; the page's various view-navigation resets (world/country/city transitions, "Clear filters") now also clear `selectedFoodStyles` for consistency with `selectedTypes`.
  - `swagger.yaml` — new `FoodStyle`/`FoodStyleInput` schemas, `/api/food-styles` + `/api/food-styles/{id}` paths (mirroring Mood Tags, minus the seed endpoint), and `foodStyles` field documented on both `Attraction` and `AttractionInput`.
- Deviations from task requirements: food style chips don't appear on `AttractionGridCard` (see the correction note above) or in "trip list rows" (no existing chip-rendering surface there either — trip detail's attraction list rows are plain text rows, not chip-based, so there was no established slot to extend without inventing a new pattern, which was out of scope).
- New design tokens used: none — `.foodStyleChip` reuses `AttractionTypePicker`'s exact category-chip tokens; the Explore filter section reuses the already-established `.chipFilterToggle` pattern; the admin section reuses existing `.typesList` row styles.
- Verified: `next build` succeeds, including the two new `/api/food-styles` route entries appearing in the route list.

## Completion Summary
Restaurant/dining attractions can now have one or more admin-managed food styles: a new "Food Styles" admin section (add/rename/delete), a multi-select chip control in the create/edit form (shown only for dining-type attractions), display in the attraction detail modal's chip row, and a collapsible filter in Explore that appears once "Dining" is a selected category. Food styles are referenced by id (like attraction types), so admin renames/deletes propagate automatically with no snapshot to keep in sync. Closed 2026-08-27.
