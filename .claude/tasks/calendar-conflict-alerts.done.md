# Task: Calendar Scheduling Conflict Alerts

Status: done

Track: A
Track reason: new inline alert/warning pattern — three distinct warning states not in the design system; needs visual spec

## Problem
When travelers schedule attractions in the CalendarSection, they can accidentally:
1. Place an attraction at a time the venue is actually closed (opening hours are stored on the attraction)
2. Schedule two attractions in exactly the same time slot (parallel conflict already detected in layout, but silently)
3. Drag/set a start time + duration that runs past the visible day end or starts before the visible day start

These actions are all allowed (non-blocking) but the user receives no feedback that something may be wrong.

## Goal
After any assignment or time/duration change in the calendar, display a non-blocking inline warning if one of the three conditions is met, so the user is aware without being prevented from continuing.

## Requirements

### Alert conditions

**Condition A — Venue closed at planned time**
- Check: `attraction.plannedTime` falls outside `attraction.openingHours[dayOfWeek].open – .close`, OR `openingHours[dayOfWeek].closed === true`
- Day of week derived from `attraction.plannedDate` (ISO date → day key Mon–Sun)
- Only fires if the attraction has `openingHours` AND `plannedTime` set

**Condition B — Parallel time conflict**
- Check: two or more attractions on the same day share overlapping time windows (start to start+duration)
- Already partially computed in `layoutTimed()` (numCols > 1 = overlap); reuse that signal
- The warning should name the conflicting attraction(s)

**Condition C — Schedule overflows visible day window**
- Check: `plannedTime` is before `dayStart` or `plannedTime + actualDuration` extends past `dayEnd` (both are configurable from `@/config/ui`)
- Only fires when `plannedTime` is set

### Alert display
- Alerts appear as a dismissible warning banner inside the CalendarSection card, below the header and above the body grid
- One banner can show multiple warnings stacked, or a single banner with multiple bullet points — one alert area handles all active warnings
- Style: amber/warning background (`--color-warning` at low opacity), amber text, a `TriangleAlert` Lucide icon, and an `X` dismiss button per alert (or clear-all)
- Alerts re-evaluate after every assign, unassign, or time/duration change — stale warnings auto-clear when the condition is resolved
- Warnings are NOT shown to read-only viewers (`isOwner === false`)

### Non-functional
- No new API calls — all checks are pure client-side logic on the existing `local` attractions state
- Dismissing an alert hides it until the underlying data changes again (re-trigger on next mutation)

## Constraints
- CSS Modules only
- Logic for all three checks should live in a utility function (colocated with CalendarSection or in a new `CalendarSection.utils.ts`)
- Use `--color-warning` and a warning-tinted background from design tokens only — no hardcoded amber hex in components

## Out of scope
- Preventing the action (user must still be able to save)
- Alerts for the trip overview card or attractions list (calendar only)
- Server-side validation of scheduling conflicts


## Implementation Notes
- Files created: `src/app/trips/[id]/CalendarSection.utils.ts`
- Files modified: `src/app/trips/[id]/CalendarSection.tsx`, `src/app/trips/[id]/CalendarSection.module.css`
- Deviations from brief: none
- New design tokens used: none (color-mix() used with var(--color-warning) only)


## Completion Summary
Created CalendarSection.utils.ts with pure logic for three alert conditions (venue closed, parallel conflict, day overflow). Alert banners appear between the header and calendar body with amber styling, individual dismiss buttons, and auto-reset on data mutations. Logic is owner-only, uses no hardcoded colors. Confirmed by user 2026-06-29.
