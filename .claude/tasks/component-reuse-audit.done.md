# Task: Component Reuse Audit & Refactor

Status: done

Track: B
Track reason: pure refactor — no new visual surface, no new design tokens; existing patterns consolidated into shared components

## Problem
As the app has grown, similar UI patterns have been implemented independently across multiple pages (analytics, profile, trips, explore). Duplicated structures — stat cards, detail panels, skeleton loaders, section headings, ranked list rows, map containers — make changes fragile and inconsistent. Developers must remember to update the same UI in multiple places.

## Goal
Identify every repeated UI structure that appears in 2+ places and extract each into a shared component, leaving no inline duplication in page-level files.

## Requirements
- Audit all page-level client files (`AnalyticsClient.tsx`, `ProfileClient.tsx`, `TripDetailClient.tsx`, `EditTripClient.tsx`, `NewTripClient.tsx`, explore pages, etc.) for repeated JSX structures
- Extract each duplicate pattern into a shared component under `src/components/`
- Export new components from `src/components/index.ts` (unless they use Leaflet/browser APIs — those must stay dynamic-only)
- After extraction, the original files must use the shared component — no side-by-side duplication
- All extracted components must use CSS Modules only (no inline styles)
- No visual regressions — extracted components must render identically to what they replaced

## Constraints
- CSS Modules only — no inline styles
- Components that use Leaflet or access `window` at module level must NOT be added to the barrel `src/components/index.ts` (SSR will break). Import them directly with `next/dynamic({ ssr: false })`
- Do not rewrite logic — only extract repeated JSX structures into components; keep data-fetching and state where it is
- Update `swagger.yaml` only if any API route changes (unlikely for this task)

## Out of scope
- Redesigning or restyling any existing UI
- Extracting components that only appear in one place
- Adding new features or data sources

## Completion Summary
Extracted four shared components — `SectionCard`, `StatCardsGrid`, `RankedList`, and `CountryFilterSelect` — from duplicated patterns across `AnalyticsClient` and `ProfileClient`. Both page modules had their duplicate CSS removed. Build confirmed clean. Confirmed by user 2026-07-13.

## Implementation Notes
- Files created: `src/components/SectionCard/SectionCard.tsx`, `src/components/SectionCard/SectionCard.module.css`, `src/components/StatCardsGrid/StatCardsGrid.tsx`, `src/components/StatCardsGrid/StatCardsGrid.module.css`, `src/components/RankedList/RankedList.tsx`, `src/components/RankedList/RankedList.module.css`, `src/components/CountryFilterSelect/CountryFilterSelect.tsx`, `src/components/CountryFilterSelect/CountryFilterSelect.module.css`
- Files modified: `src/components/index.ts`, `src/app/analytics/AnalyticsClient.tsx`, `src/app/analytics/AnalyticsClient.module.css`, `src/app/profile/ProfileClient.tsx`, `src/app/profile/ProfileClient.module.css`
- Deviations from task requirements: TripDetailClient, EditTripClient, NewTripClient, and ExploreClient were audited but contain no patterns duplicated across 2+ files — no extractions needed there
- New design tokens used: none
