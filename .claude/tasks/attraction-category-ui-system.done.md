# Task: Attraction Category UI System — Icons, Search Modal, Analytics

Status: done

Track: A
Track reason: new visual patterns — category icons in picker, AttractionSearchModal two-level filter, analytics regrouped by category; no existing design pattern for any of these

## Problem
Three places in the app still don't reflect the parent-category system:
1. Category chips in the type picker have no icons — they look less distinct than type chips
2. The AttractionSearchModal (used to search/filter existing attractions to add to a trip) still uses a flat type dropdown
3. The Analytics page groups data by individual attraction type, not by the more meaningful parent category

## Goal
Icons appear on category chips, the search modal uses the same two-level filter as the create modal, and analytics shows distribution by parent category.

## Requirements

### 1 — Category icons in type picker (`NewAttractionModal`)
Each category chip in the category view shows a Lucide icon (14px) before its label:
| Category | Icon |
|---|---|
| Food & Drink | `UtensilsCrossed` |
| Culture | `Landmark` |
| Nature & Outdoor | `TreePine` |
| Entertainment | `Ticket` |
| Shopping | `ShoppingBag` |
| Wellness | `Heart` |
| Transportation | `Plane` |
| Accommodation | `BedDouble` |

A `CATEGORY_ICONS: Record<string, LucideIcon>` constant should be exported from `attraction.constants.ts` (the types come from `lucide-react`).

### 2 — AttractionSearchModal two-level filter
`src/components/AttractionSearchModal/AttractionSearchModal.tsx` currently has a type filter (likely a `<select>` or flat chip row). Replace it with the same two-level category → type pattern already implemented in `NewAttractionModal`:
- Category view → type view → back link
- The selected type drives the `type` query param to `GET /api/attractions`
- Only single-type selection (search filters by one type at a time)
- The back button is labeled "← All categories"

### 3 — Analytics grouped by parent category
`src/app/analytics/AnalyticsClient.tsx` shows a breakdown of attractions by type. Change it to group by parent category:
- Sum attraction counts across all types within a category
- Use `CATEGORY_COLORS` for each category's color in the chart
- Label each segment/bar with the category name (not individual type name)
- Keep whatever chart type is already in use (pie, donut, bar)

## Constraints
- CSS Modules only
- Icons: Lucide only (already imported throughout the project)
- `CATEGORY_ICONS` must live in `attraction.constants.ts` so it can be imported by any consumer
- The analytics change must import `TYPE_CATEGORIES` and `CATEGORY_COLORS` from `@/components/NewAttractionModal/attraction.constants`

## Out of scope
- Changing the calendar block icon (stays per individual type — covered by the structure overhaul task)
- Filtering by multiple types in AttractionSearchModal (single type only for now)


## Implementation Notes
- Files modified: `attraction.constants.ts`, `NewAttractionModal.tsx`, `AttractionSearchModal.tsx`, `AttractionSearchModal.module.css`, `AnalyticsClient.tsx`
- Deviations from brief: Legend in AnalyticsClient used ICONS (per-type icon) for legend items; switched to CATEGORY_ICONS since categories are now the chart segments — this is an improvement over the brief which didn't specify legend icon behaviour post-aggregation
- New design tokens used: none


## Completion Summary
Category icons added to chips in NewAttractionModal and AttractionSearchModal. AttractionSearchModal two-level category filter implemented (category → type, back button). Analytics page now shows donut chart grouped by parent category using CATEGORY_COLORS. CATEGORY_ICONS exported from attraction.constants.ts. Minor fixes: chip spacing and stale 'categories' reference. Confirmed by user 2026-06-30.
