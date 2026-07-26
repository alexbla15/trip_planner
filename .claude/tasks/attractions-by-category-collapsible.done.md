# Task: Make "Attractions by Category" card collapsible

Status: done
Track: B
Track reason: `SectionCard` already implements the collapsible pattern (`collapsible`/`defaultOpen` props) and is already used elsewhere (e.g. admin Travel Moods) — this is enabling an existing prop, not building a new pattern.

## Problem
The "Attractions by Category" section (`SectionCard` wrapping `CategoryDonutChart`) appears on both `src/app/profile/ProfileClient.tsx` (~line 479) and `src/app/analytics/AnalyticsClient.tsx` (~line 221), but is rendered without the `collapsible` prop, so it's always expanded and takes up fixed vertical space even when a user wants to collapse it.

## Goal
Users can collapse/expand the "Attractions by Category" card, same as other collapsible `SectionCard` instances in the app.

## Requirements
- Pass `collapsible` (and `defaultOpen={true}`, matching the SectionCard default of "never start surprise-collapsed") to the `SectionCard` wrapping "Attractions by Category" in both `ProfileClient.tsx` and `AnalyticsClient.tsx`.

## Constraints
- No changes to `SectionCard` itself — the prop already exists and works.

## Out of scope
- Making any other `SectionCard` instance collapsible unless explicitly requested.

## Implementation Notes
- Files created/modified:
  - `src/app/profile/ProfileClient.tsx` — added `collapsible defaultOpen` to the "Attractions by Category" `SectionCard`
  - `src/app/analytics/AnalyticsClient.tsx` — added `collapsible defaultOpen` to the "Attractions by Category" `SectionCard`
- Deviations from task requirements: none
- New design tokens used: none

## Completion Summary
Enabled `SectionCard`'s existing `collapsible` prop on the "Attractions by Category" card on both the Profile and Analytics pages. Confirmed by user, closed 2026-07-26.
