# Task: Trip Detail Polish — Edit Button, Shared Badge, Overlap Alert

Status: done

Track: B
Track reason: element removal, element move within existing layout, and a logic bug fix — no new visual surfaces

## Problem
Three small issues on `trips/[id]`:
1. "Edit trip" button lives in the hero top bar — it belongs in the Trip Overview section alongside the trip data, not floating over the cover image
2. "Shared with you" badge clutters the hero for collaborators — it's redundant since the People section in Overview already shows contributors
3. The overlap time alert fires when attractions don't actually overlap by the minute — because `attractionEndMins()` in `CalendarSection.utils.ts` uses `Math.max(dur, MIN_OVERLAP_DURATION_MINS)` (30-min floor), so any attraction with no duration is treated as 30 minutes long, triggering false conflict alerts

## Goal
Edit trip is accessible from the Overview tab, the hero is clean, and the conflict alert only fires when two attractions genuinely overlap by the minute.

## Requirements

### 1. Move "Edit trip" button to Trip Overview card
- Remove the edit `<Link>` from `.heroTopBar` in `TripDetailClient.tsx`
- In the Trip Overview card (currently `activeTab === "overview"` → `<div className={styles.card}>`), wrap the `<h2 className={styles.sectionHeading}>Trip Overview</h2>` in a flex row (reuse `styles.attractionsHeader` class — it already gives `display: flex; align-items: center; justify-content: space-between`) with a `canEdit`-gated edit link on the right
- The edit link needs a new CSS class `.cardEditLink` (Track B values only):
  ```css
  .cardEditLink {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-primary);
    text-decoration: none;
    transition: color var(--duration-fast) var(--easing-out);
  }
  .cardEditLink:hover { color: var(--color-primary-dark); }
  .cardEditLink:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
  ```
- Keep `<PenLine size={13} />` icon on the edit link (already imported)
- After removing the edit link, `.heroTopBar` will only contain the back link — that's fine, `justify-content: space-between` still works with a single item

### 2. Remove "Shared with you" hero badge
- Delete the `{isCollaborator && <span className={styles.heroSharedBadge}>…</span>}` block from `.heroContent` in `TripDetailClient.tsx`
- Update the condition on `.heroMeta` from `(isCollaborator || moods.length > 0)` to just `moods.length > 0`
- Do NOT remove the `Users` import — it is still used in the People row (`styles.peopleLabel`)
- Do NOT remove `.heroSharedBadge` from the CSS module — leave it in case it's needed elsewhere

### 3. Fix overlap alert — use actual duration only
- In `src/app/trips/[id]/CalendarSection.utils.ts`, change `attractionEndMins`:
  ```ts
  // Before:
  return start + Math.max(dur, MIN_OVERLAP_DURATION_MINS);
  // After:
  return start + dur;
  ```
- Remove the now-unused `import { MIN_OVERLAP_DURATION_MINS } from "@/config/ui"` line from `CalendarSection.utils.ts`
- `MIN_OVERLAP_DURATION_MINS` is still used in `CalendarSection.tsx` and `TripDayMapWidget.tsx` for visual layout — do NOT touch those files

## Constraints
- CSS Modules only
- Do not touch `CalendarSection.tsx` or `TripDayMapWidget.tsx`
- Do not remove the `heroSharedBadge` CSS class
- Do not remove the `Users` import in `TripDetailClient.tsx`

## Out of scope
- Any other hero changes
- Calendar visual layout changes
- Dark mode

## Implementation Notes
- Files created/modified: `src/app/trips/[id]/TripDetailClient.tsx`, `src/app/trips/[id]/TripDetailClient.module.css`, `src/app/trips/[id]/CalendarSection.utils.ts`
- Deviations from task requirements: simplified hero meta structure — removed `.heroMeta` wrapper since the shared badge was removed, tag row is now a direct child of `.heroContent`
- New design tokens used: none

## Completion Summary
Confirmed by user on 2026-07-10. Edit trip button moved to the Trip Overview card header (owners and collaborators); Shared with you badge removed from the hero; overlap alert logic fixed by removing the 30-minute minimum floor from `attractionEndMins`, so conflict alerts only fire for genuine minute-level overlaps.
