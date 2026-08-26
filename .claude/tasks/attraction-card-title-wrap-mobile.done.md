# Task: Fix attraction card title wrapping on mobile

Status: done
Track: B
Track reason: CSS-only fix (text overflow/truncation behavior), no new visual pattern.

## Problem
On phone-width viewports, attraction card titles look bad — likely truncated awkwardly, overflowing, or clipped instead of wrapping to a second line.

## Goal
Attraction card titles wrap cleanly onto multiple lines on mobile instead of being cut off or overflowing, across every place the attraction card component is used (Explore grid, trip detail lists, search modal, etc.).

## Requirements
- Identify the shared attraction card component(s) and their title styling.
- Allow the title to wrap (`white-space: normal`, appropriate `word-break`/`overflow-wrap`) instead of single-line truncation, within the card's existing width/height constraints — adjust card min-height if a wrapped 2-line title would otherwise cause layout overlap.
- Verify on a real phone-width viewport that long titles wrap without breaking the card's layout, image, or badges.

## Constraints
- Keep desktop/tablet title rendering unaffected (or apply consistently if it improves those too — use judgment, but mobile is the reported problem).

## Out of scope
- Redesigning the card layout beyond what's needed to fix the wrapping.

## Implementation Notes
- Files created/modified: `src/components/AttractionGridCard/AttractionGridCard.module.css` — added a `@media (max-width: 639px)` override: `.name` switches from single-line ellipsis to a 2-line clamp (`-webkit-line-clamp: 2`) with `white-space: normal`/`overflow-wrap: break-word`; `.nameRow` switches to `align-items: flex-start` so the type icon aligns to the top of a wrapped 2-line title instead of its vertical center.
- Deviations from task requirements: scoped to `AttractionGridCard` (the grid/card view used across Explore) — this is the only component styled as an actual "attraction card" with a single-line-ellipsis title; other attraction surfaces (search modal, trip detail rows, picker modals) use list-row layouts, not cards, and weren't reported as broken.
- New design tokens used: none — reused the existing `sm` breakpoint boundary (639px, just under the design system's 640px `sm` token) and existing `.name` typography.
- Verified: card min-height already accommodates 2 lines of the 13px title without overlapping the meta/city row below it (checked at 375px viewport width with a long attraction name).

## Completion Summary
Attraction grid card titles now wrap to 2 lines on mobile (sub-640px) instead of truncating with an ellipsis, with the type icon aligned to the top of the wrapped text. Closed 2026-08-26.
