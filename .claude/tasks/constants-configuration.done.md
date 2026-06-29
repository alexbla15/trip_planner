# Task: Centralize UI Constants into Config Module

Status: done

Track: B
Track reason: pure refactoring — no visual or behavioral change, just moves magic numbers to one importable location

## Problem
UI constants (timeline hours, slot height, page size, minimum block sizes) are scattered as inline literals across CalendarSection.tsx and TripDetailClient.tsx. Changing one value (e.g., default day start hour or page size) requires hunting through component files. As the app grows this becomes error-prone.

## Goal
All tuneable UI constants live in a single `src/config/ui.ts` file so they can be found and adjusted in one place without touching component logic.

## Requirements

### Create `src/config/ui.ts`
Export named constants currently defined inline in components:

**From `src/app/trips/[id]/CalendarSection.tsx`:**
- `DEFAULT_DAY_START = 7` (was `DEFAULT_START`)
- `DEFAULT_DAY_END = 23` (was `DEFAULT_END`)
- `SLOT_HEIGHT_PX = 60` (was `SLOT_HEIGHT`)
- `MIN_CARD_HEIGHT_PX = 20` (was `MIN_CARD_H`)
- `MIN_BLOCK_WIDTH_PX = 110` (was `MIN_BLOCK_W`)
- `MIN_OVERLAP_DURATION_MINS = 30` (was inline `30` in `endMins()`)

**From `src/app/trips/[id]/TripDetailClient.tsx`:**
- `ATTRACTIONS_PAGE_SIZE = 10` (was inline `PAGE_SIZE = 10` in render body)

### Update references
- `CalendarSection.tsx`: import the constants from `@/config/ui` and replace all inline usages
- `TripDetailClient.tsx`: import `ATTRACTIONS_PAGE_SIZE` and use instead of inline `PAGE_SIZE`

## Constraints
- No behavior change — values stay identical, only their source location changes
- `src/config/ui.ts` exports only named constants (no default export)
- Do not move constants that are component-internal and genuinely not tuneable (e.g., `LABEL_W = 46`, `PAD_R = 4` which are layout arithmetic)

## Out of scope
- Moving attraction types, mood tags, or opening hours defaults (those are domain data, not UI config)
- Moving colors or spacing tokens (those live in the design system CSS variables)
- Moving API URLs or auth constants

## Implementation Notes
- Files created: `src/config/ui.ts`
- Files modified: `src/app/trips/[id]/CalendarSection.tsx`, `src/app/trips/[id]/TripDetailClient.tsx`
- Deviations from task requirements: none
- New design tokens used: none


## Completion Summary
Created src/config/ui.ts with 7 named UI constants (DEFAULT_DAY_START, DEFAULT_DAY_END, SLOT_HEIGHT_PX, MIN_CARD_HEIGHT_PX, MIN_BLOCK_WIDTH_PX, MIN_OVERLAP_DURATION_MINS, ATTRACTIONS_PAGE_SIZE). Updated CalendarSection.tsx and TripDetailClient.tsx to import from the config module, removing all inline magic number declarations. User immediately demonstrated the system by editing ATTRACTIONS_PAGE_SIZE from 10 to 5. Confirmed 2026-06-29.
