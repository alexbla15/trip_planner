# Task: Editing Attraction Removes It from Calendar

Status: done

Track: B
Track reason: bug fix — pure state management fix in TripDetailClient, no visual change

## Problem
When an attraction has been assigned to a calendar day (with `plannedDate` set locally / optimistically), editing that attraction's details (name, types, notes, etc.) causes it to disappear from the calendar. The edit PUT request succeeds, but the server response reflects the DB state of `plannedDate` — which is `null` if the calendar assignment has not yet been saved. When the response replaces the attraction in the parent's `attractions` state, the calendar assignment is lost.

## Goal
Editing an attraction's details preserves its current calendar assignment (plannedDate, plannedTime, actualDurationValue, actualDurationUnit) regardless of whether those changes have been saved to the DB yet.

## Root Cause
In `src/app/trips/[id]/TripDetailClient.tsx`, `handleAttractionUpdate` (line ~173):

```ts
if (res.ok) {
  const updated = (await res.json()) as Attraction;
  setAttractions((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
}
```

The `updated` object comes from the server, which reflects DB state (`plannedDate: null` if unsaved). It completely replaces the attraction in state, discarding any locally-held calendar fields.

## Requirements
- In `handleAttractionUpdate`, after a successful PUT response, merge the server-returned attraction with the **current** attraction's calendar fields (from the `prev` array inside the state updater):

```ts
setAttractions((prev) =>
  prev.map((a) => {
    if (a._id !== updated._id) return a;
    return {
      ...updated,
      plannedDate: a.plannedDate,
      plannedTime: a.plannedTime,
      actualDurationValue: a.actualDurationValue,
      actualDurationUnit: a.actualDurationUnit,
    };
  })
);
```

This preserves the local calendar state (whether pending or already saved) while taking the server's authoritative values for all non-calendar fields.

## Constraints
- Only touch `src/app/trips/[id]/TripDetailClient.tsx`
- The same merge pattern should be applied if `handleAttractionUpdate` uses the updated attraction for any other purpose downstream

## Out of scope
- Any changes to the API
- Any changes to CalendarSection

## Implementation Notes
- Files modified: `src/app/trips/[id]/TripDetailClient.tsx`
- Deviations from task requirements: none
- New design tokens used: none


## Completion Summary
Bug fixed: handleAttractionUpdate in TripDetailClient.tsx now merges server response with the current attraction's calendar fields (plannedDate, plannedTime, actualDurationValue, actualDurationUnit), so editing an attraction no longer clears its calendar assignment. Confirmed by user 2026-06-29.
