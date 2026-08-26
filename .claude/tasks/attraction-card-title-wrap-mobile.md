# Task: Fix attraction card title wrapping on mobile

Status: intake
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
