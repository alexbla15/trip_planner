# Task: Pricing section tabs overflow badly with many product tabs

Status: done
Track: B
Track reason: small UI tweak — layout/overflow fix using existing design tokens, no new visual pattern

## Problem
In the pricing section (attraction detail and/or the price-tier editor), when there
are many product tabs (e.g. "Galaxy", "Entry", "Fast Pass", ...), the tab row breaks
the layout — it looks bad, likely wrapping awkwardly or overflowing the container.

## Goal
When tab count is high, the tab row stays usable and visually clean — either by
scrolling horizontally or another appropriate layout solution — instead of breaking
the container.

## Requirements
- Handle overflow of the tab list gracefully (horizontal scroll with visible affordance,
  or equivalent) on both desktop and mobile
- Preserve existing tab styling/spacing from docs/DESIGN_SYSTEM.md
- Test with a high tab count (5+) to confirm no layout breakage

## Constraints
- Keep the fix scoped to the tab row container; do not restructure the pivot table or
  editor logic

## Out of scope
- Changing how tabs are created/named (editor logic)

## Implementation Notes
- Files created/modified: src/components/AttractionDetailModal/AttractionDetailModal.module.css (.priceTabs gets overflow-x: auto + thin scrollbar; .priceTab gets flex-shrink: 0 + white-space: nowrap so tabs no longer wrap/break the row, they scroll instead)
- Deviations from task requirements: none. Note: .priceTabs/.priceTab is a shared class used for both the Prices tab row and the seasonal Opening Hours tab row, so this fix applies to both automatically — not scope creep, same component.
- New design tokens used: none (uses existing scroll pattern already established by .priceTableScroll)

## Completion Summary
Added horizontal scroll to the shared .priceTabs/.priceTab classes (Prices tab row and seasonal Opening Hours tab row) so a high tab count scrolls instead of wrapping and breaking the layout. Confirmed by the user 2026-09-03.
