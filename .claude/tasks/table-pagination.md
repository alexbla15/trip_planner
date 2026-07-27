# Task: Pagination for Tables (Max 5 Rows)

Status: intake

Track: A
Track reason: No pagination UI component exists for `<table>` elements today (a *list* pagination pattern exists for the trip-detail attractions list — see Implementation Notes in `.claude/tasks/attractions-pagination.done.md` — but not a table-row pattern, and page size/behavior here differs).

## Problem
There is exactly one real data `<table>` in the app: the "Top Explorers" leaderboard in `src/app/analytics/AnalyticsClient.tsx` (line ~247), which renders `data.topUsers` in full with no pagination. As the user base grows this table will scroll indefinitely with no way to page through it.

## Goal
Any table in the app showing a list of rows is paginated at a maximum of 5 rows per page, with clear controls to move between pages.

## Requirements
- Build a small reusable table-pagination pattern (component and/or hook) that any `<table>` in the app can adopt
- Apply it to the "Top Explorers" table in `AnalyticsClient.tsx`: max 5 rows visible per page
- Show page controls (Previous/Next + "Page X of Y", consistent with the style already established in `.claude/tasks/attractions-pagination.done.md`'s implementation) only when total rows > 5
- Accessible: `aria-label`s on Previous/Next, `aria-live="polite"` (or similar) on the page indicator
- Responsive: controls fit cleanly on mobile
- If any other `<table>` is added to the app later, this pattern should be straightforward to reuse — but do not go retrofit non-table list UIs (e.g. `AdminClient.tsx`'s div-based category/type/mood lists) as part of this task; those aren't `<table>` elements and are out of scope per the "tables" framing

## Constraints
- CSS Modules only
- No external pagination library — `useState`-driven client-side slicing, consistent with the existing attractions-list pagination precedent
- Data is already fetched client-side for the analytics table — no server-side pagination needed

## Out of scope
- Server-side/API pagination (skip/limit) — not needed since table data is already fully fetched
- Sorting/filtering within the table (separate concern)
- Converting the `AdminClient.tsx` div-based lists into tables
