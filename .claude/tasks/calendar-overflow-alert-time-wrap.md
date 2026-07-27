# Task: Fix Nonsensical "Runs Until 24:50" Overflow Alert

Status: intake

Track: B
Track reason: Bug fix — broken output (wrong displayed time), not a new visual pattern. Pre-existing, already-documented follow-up from a prior task.

## Problem
The calendar's overflow alert (`getOverflowAlerts` in `src/app/trips/[id]/CalendarSection.utils.ts:97-126`) warns when an activity runs past the visible day end, using the message `"${a.name}" runs until ${endH}:${endM}, past the visible day end...`. `endH`/`endM` are derived directly from `attractionEndMins(a)` (`CalendarSection.utils.ts:23-30`), which computes `start + duration` in raw minutes with no wrap at 1440 (midnight). For a late-starting, long-duration activity, this produces values like `endH = 24`, `endM = 50` — displayed as "24:50", which isn't a real time and reads as broken.

This was already identified and explicitly deferred in `.claude/tasks/calendar-overnight-blocks-and-autofit.done.md` ("pre-existing behavior, unrelated to this task"). The overnight-continuation feature added since then (spillover blocks rendered on the next day, "↷ until HH:MM" in `CalendarSection.tsx`) correctly wraps/formats its own times — but the overflow-alert text path was not updated to match, so the two are now inconsistent: one subsystem shows a sensible wrapped time, the other shows the raw, unwrapped one.

## Goal
The overflow alert always shows a real, sensible time — wrapping past midnight (e.g. "00:50 the next day") instead of an impossible hour like "24:50" — consistent with how the overnight-continuation blocks already display their end time.

## Requirements
- In `getOverflowAlerts` (`CalendarSection.utils.ts` ~lines 115-122), format the displayed end time using `endMins % 1440` instead of the raw `endMins`
- When the wrapped time indicates the activity spills into the next day (`endMins >= 1440`), make that explicit in the message (e.g. "…runs until 00:50 the next day" or "+1d"), rather than silently showing a wrapped time with no day context
- Keep behavior for same-day overflows (activity ends after `dayEnd` but before midnight) unchanged — only the midnight-and-beyond case is currently broken
- Reuse whatever "next day" phrasing/format the overnight-continuation blocks in `CalendarSection.tsx` already use, so the two subsystems read consistently to the user

## Constraints
- Don't change `attractionEndMins`'s underlying raw-minutes calculation or the overnight-continuation block rendering logic itself — those are correct; only the overflow-alert message formatting is broken
- CSS Modules / existing patterns only — this is a logic/formatting fix, no new UI

## Out of scope
- Redesigning the overflow-alert UI/styling
- Changing when an overflow alert is triggered (the `endMins > dayEnd * 60` condition itself is correct and unrelated to this bug)
