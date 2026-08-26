# Task: Searchable, sorted, paginated attraction-category picker in Analytics (inline, not a popup)

Status: intake
Track: A
Track reason: replaces an existing popup interaction with a new inline expanding-box pattern, plus search/sort/pagination controls not yet established for this picker.

## Problem
When picking an attraction category in Analytics, the current picker opens as a popup/modal with no search box, no pagination, and results not ordered alphabetically — making it slow to find a category once the list is long.

## Goal
Picking a category in Analytics no longer opens a popup; instead, an inline box renders below the trigger (in the page flow) containing a search input, alphabetically-sorted results, and pagination — so the user can type to filter, see results in a predictable order, and page through them without a modal overlay.

## Requirements
- Remove the popup/modal behavior for the category picker.
- Render an inline expanding box directly beneath the picker trigger when opened (pushes surrounding content down, not an overlay).
- Add a search/filter text input at the top of the box that filters results by category name as-you-type.
- Sort results alphabetically (A→Z) by default.
- Paginate results using the app's existing pagination UI pattern (see `NearbyAttractionsModal` / the Explore grid pagination from `explore-grid-view.done.md`).
- Selecting a category closes/collapses the inline box and applies the filter to the Analytics view, same as the popup did today.

## Constraints
- Reuse the existing pagination component/pattern rather than building a new one.
- Keep the same underlying category data/filtering logic — this task changes presentation and browsability, not what categories exist or how they filter Analytics data.

## Out of scope
- Multi-select category picking (unless it already works that way today — preserve existing single/multi behavior, don't change it).
