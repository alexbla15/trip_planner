# Task: Analytics Category Drill-Down Sub-Chart

Status: done

Track: A
Track reason: new interactive chart pattern — clicking a category slice reveals a second donut chart; gradient color palette per category; no existing pattern

## Problem
The analytics page shows a single donut chart grouped by 8 parent categories. Travelers and admins cannot see which specific attraction types (e.g., Restaurant vs. Café vs. Food Truck) are most popular within a category.

## Goal
Clicking a category slice on the main donut reveals a second donut chart alongside it, showing the breakdown of individual attraction types within that category using a gradient of the parent category's color.

## Requirements

### Interaction
- Clicking a category slice on the main donut:
  - Highlights the selected slice (scale up slightly or increase opacity)
  - Shows a second donut chart to the right of (or below on mobile) the first
  - The second chart shows only the attraction types within the selected category, with their raw counts
- Clicking the same category again (or clicking empty space) deselects and hides the second chart
- Clicking a different category switches the second chart to that category's types

### Sub-chart colors
- Each type within the selected category gets a shade of the parent category color
- Gradient from 100% opacity to ~35% opacity, distributed evenly across the types in that category
- e.g., Food & Drink (#F59E0B) with 5 types: shades from #F59E0B → light amber tints

### Sub-chart data
- The raw `data.categoryDistribution` array (individual types from DB) already contains the per-type counts
- Filter it to only the types that belong to the selected category (via TYPE_CATEGORIES)
- If a type has count 0 or is not in the raw data, exclude it from the sub-chart

### Layout
- Desktop: both charts side by side in the same card
- Mobile (≤640px): sub-chart stacks below the main chart
- Sub-chart has its own small legend below it showing type name + count

### Non-functional
- No new API call — data is already fetched
- The second chart should appear with a simple fade-in (opacity 0→1, 150ms)

## Constraints
- CSS Modules only
- No chart library — continue using the existing hand-rolled SVG donut
- Import `TYPE_CATEGORIES`, `CATEGORY_COLORS` from `@/components/NewAttractionModal/attraction.constants`

## Out of scope
- Drill-down beyond the type level
- Animated slice transitions on the first chart (existing hover state is sufficient)


## Implementation Notes
- Files modified: `src/app/analytics/AnalyticsClient.tsx`, `src/app/analytics/AnalyticsClient.module.css`
- Deviations from brief: none
- New design tokens used: none (tintColor uses hardcoded RGB math, not tokens — this is intentional since CSS tokens cannot be parsed into RGB components for mixing)


## Completion Summary
Clicking a category slice on the main donut reveals a second SVG donut showing individual types within that category, colored as tinted shades of the parent category color. Sub-chart fades in with a slide animation, stacks below on mobile. Main donut slices and legend rows are clickable and keyboard-navigable. Confirmed by user 2026-06-30.
