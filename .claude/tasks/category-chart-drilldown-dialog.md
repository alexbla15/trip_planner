# Task: Sub-category pie slice opens an attractions list dialog

Status: done
Track: B
Track reason: reuses the existing `ModalShell` dialog pattern and the attraction-row list styling already established in `AttractionSearchModal`/`AttractionPickerModal` — no new visual pattern, just wiring an existing click affordance (sub-slices already exist, just unclickable) to a new dialog and a small API extension.

## Problem
`CategoryDonutChart` (`src/components/CategoryDonutChart/CategoryDonutChart.tsx`) already lets a user click a top-level category slice to reveal a sub-chart broken down by attraction type ("sub-category") — see `selectedCategory`/`subSlices`/`subLegend` (lines 198-247). Those sub-slices and their legend rows currently have no click handler (unlike the top-level slices, which do). Clicking a sub-category should show the actual attractions in that type, not just its aggregate count. The chart is used in two places with different scope: `/profile` (`ProfileClient.tsx`, scoped to the current user's own attractions) and `/analytics` (`AnalyticsClient.tsx`, all attractions site-wide).

## Goal
Clicking a sub-category slice or its legend row opens a dialog listing the real attractions in that type — the current user's own attractions when on `/profile`, all attractions when on `/analytics`.

## Requirements
- Add `onClick`/`onKeyDown` (Enter/Space, matching the existing top-level legend item pattern at lines 171-177) handlers to the sub-chart's slices (`subSlices`, ~line 214) and legend rows (`subLegendItem`, ~line 233) in `CategoryDonutChart.tsx`.
- `CategoryDonutChart` needs a way to know whether it's in "mine only" or "global" mode, and (for "mine only") the current user's id — add an optional prop, e.g. `ownerId?: string` (undefined = global/all attractions). Pass it from `ProfileClient.tsx` (the logged-in user's id — already available via `useAuth()` in that file) and leave it unset from `AnalyticsClient.tsx`.
- Build a new dialog component (own folder under `src/components/`, e.g. `CategoryAttractionsModal`) using the shared `ModalShell` (`src/components/Modal`) — same wrapper `AttractionSearchModal`/`AttractionPickerModal` already use. Props: the clicked type name, the `ownerId` (optional), `onClose`. On open, fetches and lists matching attractions (name, city, country — reuse the row layout/styling conventions from `AttractionSearchModal`'s results list rather than inventing new row markup). Include loading and empty states consistent with those existing modals.
- Extend `GET /api/attractions` (`src/app/api/attractions/route.ts`) to support this query shape:
  - Make `country`/`city` no longer required when a `type` param is present (currently the route 400s if both are missing — see lines 16-18).
  - Add an optional `ownerId` query param that adds `{ ownerId }` to the Mongo filter — mirror the exact scoping already used by `src/app/api/analytics/summary/route.ts`'s `categoryDistribution` aggregation (`{ ownerId, subtype: { $ne: "flight" } }` — line 63 there) so the dialog's result count is consistent with what the chart already displayed for that user. When `ownerId` is present, also exclude `subtype: "flight"` to match; when absent (global/analytics case), no extra filter is needed beyond `type` (mirrors `analytics/global`'s `categoryDistribution`, which only excludes flights at the aggregate stage — flights won't have a normal attraction type assigned anyway, so filtering by a real type name is already equivalent).
  - Pick a reasonable result cap for a type-only query (e.g. 200) — this is a browse list, not a paginated view; pagination is out of scope.
- Update `swagger.yaml` for `GET /api/attractions` — document the new optional `ownerId` param and that `country`/`city` become optional when `type` is supplied.

## Constraints
- Do not change the existing top-level category slice behavior (still opens the sub-chart, unchanged).
- Do not require `country`/`city` to remain mandatory for existing callers — verify no other caller of `GET /api/attractions` breaks by making the requirement conditional (it should not, since existing callers already pass country/city).
- ~~Attraction rows in the new dialog are read-only~~ — **superseded mid-implementation:** user requested that clicking an attraction row in the dialog opens its detail card. Reuse the existing `AttractionDetailModal` (`src/components/AttractionDetailModal`) — it already takes `attraction: Attraction | null` + `onClose` with no edit-flow coupling, so it drops in without new UI.

## Out of scope
- Pagination or infinite scroll in the dialog (flat capped list is fine).
- Any change to the top-level category chart/legend interaction.

## Implementation Notes
- Files created/modified:
  - `src/components/CategoryAttractionsModal/` (new folder: `.tsx`, `.module.css`, `.types.ts`, `index.ts`) — dialog built on `ModalShell`, row markup/skeleton/empty states adapted from `AttractionSearchModal`. Rows are `<button>`s; clicking one opens `AttractionDetailModal` (reused as-is, no changes needed there).
  - `src/components/index.ts` — barrel export for the new component.
  - `src/components/CategoryDonutChart/CategoryDonutChart.tsx` — added `ownerId?`/`token?` props, `selectedType` state, `handleSubSliceClick`, `onClick`/`onKeyDown` on sub-slices and sub-legend rows, renders `CategoryAttractionsModal` when a sub-category is selected.
  - `src/components/CategoryDonutChart/CategoryDonutChart.module.css` — `.subLegendItem` changed from `cursor: default` (no affordance) to `cursor: pointer` + hover/focus-visible background, matching the existing `.legendItem` pattern, since it's now clickable.
  - `src/app/profile/ProfileClient.tsx` — passes `ownerId={authUser._id}` and `token` to `CategoryDonutChart` (guarded by the component's existing `if (!authUser) return null` above this render).
  - `src/app/analytics/AnalyticsClient.tsx` — no change; omitting `ownerId` already means "global," which is correct as-is.
  - `src/app/api/attractions/route.ts` — `type` alone now satisfies the country/city/type requirement; new optional `ownerId` param adds `{ ownerId, subtype: { $ne: "flight" } }` to the filter (mirrors `analytics/summary`'s `categoryDistribution` scoping exactly, so dialog counts match what the chart already showed); result cap raised to 200 for type-only queries.
  - `src/services/attractions.service.ts` + `src/services/index.ts` — new `searchAttractionsByType(type, ownerId?, token?)`.
  - `swagger.yaml` — updated `GET /api/attractions` param docs (new `ownerId`, `type` alone now sufficient).
- Deviations from task requirements: **the user asked mid-implementation for dialog rows to be clickable and open the attraction's detail card** — reversed the brief's original "read-only, no click-through" constraint. Implemented by reusing `AttractionDetailModal` unchanged (it already supports being opened with just an `Attraction` + `onClose`, no trip/edit context required).
- New design tokens used: none — reused existing tokens throughout (both new CSS modules are near-verbatim adaptations of `AttractionSearchModal.module.css`'s token usage).

Verification: `tsc --noEmit` clean. `eslint` on all touched files shows one `react-hooks/set-state-in-effect` error in the new `CategoryAttractionsModal.tsx` — this exact "fetch on effect, setState in .then()" pattern already exists unfixed in `AttractionSearchModal.tsx` (verified by running eslint on it directly) and in several other files across the repo, so this new file matches established (if imperfect) repo convention rather than inventing a one-off workaround. All other pre-existing errors/warnings in touched files (`ProfileClient.tsx`, `CategoryDonutChart.tsx`) confirmed via `git diff` to be on lines outside this change. Full `next build` succeeds, 33 routes build clean. Manually verified live against the dev server and real DB data: `GET /api/attractions` returns 400 with no params, returns real attraction rows for `?type=Restaurant`, and correctly scopes/empties for `?type=Restaurant&ownerId=<real-id>` vs. a bogus id.
