# Task: ShopStyle sub-category for Shopping attractions

Status: done

Track: B
Track reason: Mirrors the existing FoodStyle sub-category system (model, API, hook, service, admin UI, picker/filter/display UI) field-for-field, reusing the already-established IconPicker component — no new visual pattern or design surface, purely a data/logic extension of an existing pattern.

## Problem
Shopping-category attractions (stores, boutiques, malls) have no way to be sub-categorized the way Dining attractions already are via FoodStyle (e.g. "American", "Italian"). The user wants a "Fashion" sub-category (and the system to support others later) for shops, the same way FoodStyle works for restaurants — but with a proper icon per style, which FoodStyle itself doesn't have.

## Goal
A Shopping-category attraction can be tagged with one or more ShopStyle values (starting with "Fashion"), each with its own icon, visible and editable everywhere FoodStyle already is (New/Edit Attraction modal, Explore filters, Attraction detail view, Admin management).

## Requirements
- New `ShopStyle` model: `{ name: string (unique), icon: string (Lucide name via existing IconPicker) }`.
- `Attraction.shopStyles: ObjectId[]` ref, populated and flattened to `string[]` names on the client exactly like `foodStyles`.
- CRUD API at `/api/shop-styles` (admin-only write), mirroring `/api/food-styles`.
- Hook (`useShopStyles`) + service (`shopStyles.service.ts`) mirroring the FoodStyle equivalents.
- Admin management UI (`ShopStyleForm` + list) with an IconPicker field, mirroring `FoodStyleForm` but with icon support like `MoodTagForm`/`AttractionTypeForm`.
- New/Edit Attraction modal: shows a ShopStyle picker when the attraction's selected type(s) resolve to the Shopping category, mirroring the `isDining`/FoodStyle picker gating — each chip shows its own icon via `renderTypeIcon`.
- Explore sidebar filter: a ShopStyle chip filter gated on Shopping category selection, mirroring the FoodStyle filter.
- Attraction detail modal: displays ShopStyle chips with per-style icons (an improvement over FoodStyle's single generic icon).
- Seed one `ShopStyle` doc: `{name: "Fashion", icon: <a real registered icon from ICON_REGISTRY>}`.
- Backfill existing clearly-fashion/apparel retailer attractions (Zara, H&M, Mango, Fox, Castro, Timberland, etc.) with the new Fashion style's id.

## Constraints
- Must reuse the existing `IconPicker`/`renderTypeIcon`/`ICON_REGISTRY` convention from `src/components/IconPicker/` — no new icon system.
- Must not break any existing FoodStyle behavior (populate calls add `shopStyles` alongside `foodStyles`, not replacing it).

## Out of scope
- Any ShopStyle values beyond "Fashion" for now (the system should support more later, but only Fashion needs to be seeded).
- Redesigning the FoodStyle UI to also show per-style icons (not requested, leave FoodStyle as-is).

## Completion Summary
Built a full ShopStyle sub-category system mirroring FoodStyle (model, CRUD API, service, hook, admin UI, New/Edit Attraction picker, Explore filter, detail-view chips), with real per-style icons via the existing IconPicker component — an improvement over FoodStyle, which has no icon field. Seeded one "Fashion" style (icon: ShoppingBag) and backfilled 110 existing clothing-retailer attractions (Zara, H&M, Mango, Gucci, Nike, Levi's, etc.), excluding footwear-only, homeware, and mall-level records. `npx tsc --noEmit` clean. Confirmed by user 2026-10-05.
