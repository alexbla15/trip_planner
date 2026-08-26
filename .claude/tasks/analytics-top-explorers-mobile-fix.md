# Task: Fix Analytics "top explorers" view on phone

Status: intake
Track: B
Track reason: responsive layout bug fix, no new visual pattern needed.

## Problem
The "top explorers" view/widget on the Analytics page is broken or unusable on phone-width viewports (exact breakage to be diagnosed — likely overflow, cramped layout, or unreadable content at narrow widths).

## Goal
The top explorers view on Analytics renders correctly and is fully usable on phone-width viewports, matching the quality of its desktop presentation.

## Requirements
- Locate the top explorers component within the Analytics page and reproduce the mobile issue in a phone-width viewport.
- Fix the responsive layout (spacing, overflow, font sizing, stacking) so all content is visible and usable without horizontal scrolling or clipped elements.
- Verify no regression to the desktop/tablet presentation.

## Constraints
- Reuse existing responsive patterns/breakpoints already established elsewhere in Analytics rather than inventing new ones.

## Out of scope
- Any change to the underlying top-explorers data/logic — this is a display-only fix.
