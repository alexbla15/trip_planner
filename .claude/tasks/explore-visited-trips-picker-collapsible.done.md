# Task: Make the visited / "in my trips" picker in Explore collapsible

Status: done
Track: A
Track reason: new collapse/expand interaction not yet established for this specific picker.

## Problem
The visited / "used in my trips" filter picker in `/explore` is always fully expanded, taking up permanent space even when the user isn't actively using it.

## Goal
The visited / "in my trips" picker in Explore can be collapsed to a compact header and expanded back to its full control set, so it takes up minimal space when not in use.

## Requirements
- Add a collapse/expand affordance (chevron + click, matching any existing collapsible pattern already in this codebase — check `attractions-by-category-collapsible.done.md` / `collapse-uniform-weekly-hours.done.md` for the established interaction) to the visited/in-my-trips picker section.
- Collapsed state shows a compact summary (e.g. section label + active-filter count badge if any filters are set) so the user knows filters are still applied even when collapsed.
- Expanded state shows the full existing picker UI unchanged.
- Default state (expanded or collapsed) — default to collapsed unless filters are already active, matching the general principle of "don't hide active state from the user."

## Constraints
- Reuse the codebase's existing collapsible-section pattern/component rather than building a new one from scratch.
- Do not change the picker's filtering logic — only its collapse/expand chrome.

## Out of scope
- Changing what the picker filters by or how filtering works.

## Implementation Notes
- Files created/modified:
  - `src/app/explore/ExploreClient.tsx` — combined the visited-status and trip-usage chip groups (previously two always-expanded `.chipGroup` blocks) under one collapsible header, "Visited & trip status", reusing the exact toggle/collapse interaction already established by `AttractionFilter`'s `collapsible` prop (chevron rotates, `aria-expanded`/`aria-controls`, badge shows combined active-filter count). Added `visitedPickerOpen` state (default `false` — both filters always start at `"all"` on mount, so "default open only if a filter is active" is trivially satisfied) and a `useId()`-generated collapse-panel id.
  - `src/app/explore/ExploreClient.module.css` — added `.chipFilterToggle`/`.chipFilterBadge`/`.chipFilterChevron`/`.chipFilterChevronOpen`/`.chipFilterCollapse`/`.chipFilterCollapseOpen`/`.chipFilterInner`, copied verbatim (same tokens, same grid-template-rows collapse technique) from `AttractionFilter.module.css` — CSS Modules don't share styles across files, so the pattern is replicated locally rather than cross-imported; `AttractionFilter.tsx` itself is untouched.
- Deviations from task requirements: treated "the visited / in my trips picker" as one combined collapsible section (both chip groups share a single toggle) rather than two independently-collapsible sections — matches how the task/user described it as a single picker, and keeps the badge count meaningful as "how many of these filters are active" in one glance.
- New design tokens used: none — 1:1 reuse of tokens already used by `AttractionFilter`'s own collapsible toggle.
- Verified: `next build` succeeds.

## Completion Summary
Explore's visited-status and trip-usage filters now collapse under one "Visited & trip status" toggle with an active-count badge, reusing AttractionFilter's exact collapse pattern; defaults collapsed since both filters start inactive. Closed 2026-08-26.

## Revision (post-close user feedback)
User asked to also move the existing "Category/Type" filter (`AttractionFilter` with `collapsible`) to sit directly under the new "Visited & trip status" toggle, and style its foldable header consistently:
- Deduplicated the `AttractionFilter` instance — it was previously rendered twice (once inside the country-view block, once inside city-view), both driven by the same view-agnostic `availableCategories`/`availableTypes` memos. Hoisted to a single instance in `sidebarHeader`, right after the visited/trip-status toggle, removing both duplicates.
- Set `collapsibleLabel="Category & type"` to match the "X & Y" phrasing of the new "Visited & trip status" label — both toggles now share identical CSS classes, icon, chevron, and badge behavior.
- Fixed a padding/alignment mismatch: the `AttractionFilter` was wrapped in `.filterSection` (its own `12px 16px 16px` padding + top border), double-applying padding on top of `sidebarHeader`'s own `20px 16px 12px` + `10px` flex gap that already spaces out the visited/trip-status block. Removed the `.filterSection` wrapper so both toggles align identically.
Verified via `next build` after each change.
