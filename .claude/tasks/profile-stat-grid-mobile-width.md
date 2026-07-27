# Task: Fix Uneven Stat Card Widths on /profile (Mobile)

Status: done

Track: B
Track reason: Bug fix to an existing grid's CSS — broken layout, not a new visual pattern.

## Problem
`/profile` (`ProfileClient.tsx` → `StatCardsGrid` component) looks bad on mobile. `StatCardsGrid.module.css` uses `grid-template-columns: repeat(2, 1fr)` below 768px, but the grid is passed 5 stat items ("My Trips", "My Attractions", "Cities Visited", "Countries", "Budget Planned"). With 5 items in a 2-column grid, the 5th card lands alone in a 3rd row occupying only one of the two columns — it doesn't span full width, so it reads narrower/misaligned compared to the paired cards above it.

## Goal
On mobile, all stat cards in the profile grid appear visually consistent — no single leftover card looks narrower or misaligned relative to the others.

## Requirements
- Fix `StatCardsGrid.module.css` (or add logic in `StatCardsGrid.tsx`) so that when the item count is odd and doesn't fill the last row evenly, the leftover card reads as intentional — e.g. make the last (odd) card span the full row width (`grid-column: 1 / -1`) rather than sitting in a single half-width column
- Verify the fix holds regardless of exact item count (don't hardcode "5") — should handle any odd count in a 2-column grid gracefully
- Tablet (3-column) and desktop (5-column) layouts must remain visually correct too — check for the same odd-leftover issue at those breakpoints and fix if present

## Constraints
- CSS Modules only — `src/components/StatCardsGrid/StatCardsGrid.module.css` (and `.tsx` only if a CSS-only fix isn't sufficient, e.g. detecting "last item" for the spanning rule)
- Don't change the 5 stat items themselves or their data

## Out of scope
- Adding/removing stat cards
- Redesigning card visual style (colors, icons, typography) — only the grid/width behavior is in scope

## Implementation Notes
- Files created/modified: `src/components/StatCardsGrid/StatCardsGrid.module.css`
- Deviations from task requirements: none
- New design tokens used: none
- Approach: used the CSS-only "orphan card" technique — `.grid > :last-child:nth-child(2n+1)` (and the `3n+1` / `5n+1` equivalents per breakpoint) matches the last card only when it's alone in the final row, and spans it full width (`grid-column: 1 / -1`). This is driven purely by the last card's structural position, so it generalizes to any item count at any of the three breakpoints (2/3/5 columns) — nothing hardcoded to "5 items". Each breakpoint resets to `grid-column: auto` via an equal-specificity `:nth-child(n)` selector before reapplying its own span rule, so the cascade behaves correctly across all three breakpoints simultaneously matching at wider viewports.
- This also fixes the same class of issue for the Analytics page's `StatCardsGrid` usage (`AnalyticsClient.tsx`, also 5 items) since both consume the same shared component/CSS.

## Completion Summary
Fixed uneven stat-card widths on mobile by adding a CSS-only "orphan card" rule to `StatCardsGrid.module.css` — the last card spans full row width only when it's alone in the final row, generalized across all three breakpoints (2/3/5 columns) via nth-child math rather than hardcoded to the current 5-item count. Also benefits the Analytics page, which shares the same component. Confirmed by user. Closed 2026-07-27.
