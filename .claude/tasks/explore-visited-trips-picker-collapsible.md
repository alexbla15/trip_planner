# Task: Make the visited / "in my trips" picker in Explore collapsible

Status: intake
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
