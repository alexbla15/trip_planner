# Task: Trip Calendar Wizard

Status: intake

Track: A
Track reason: major new UI surface — a multi-day calendar planner that distributes attractions across trip dates; no existing pattern

## Problem
Travelers have a list of attractions but no way to plan *when* during the trip they'll visit each one. There is no tool to visualise the itinerary day-by-day, check if the budget and time fit, or distinguish between the recommended duration for an attraction and the actual time they plan to spend.

## Goal
A calendar wizard on the trip detail page that lets travelers drag or assign attractions to specific days, set their actual planned duration (distinct from the recommended duration stored on the attraction), and see a per-day budget and time summary.

## Requirements

### Data model changes
- Add `plannedDate?: string` (ISO date, one of the trip's days) to Attraction — stored on the attraction document
- Add `actualDurationValue?: string` and `actualDurationUnit?: 'minutes' | 'hours'` to Attraction — the traveler's planned time vs the stored `durationValue`/`durationUnit` (which becomes the "recommended" time)
- Update `PUT /api/attractions/[id]` to accept and save these new fields
- Update `Attraction` TypeScript type in `src/types/attraction.ts`

### UI — Calendar tab on Trip Detail

Add a "Calendar" tab/section to the trip detail page (alongside the existing "Attractions" card). The tab shows:

**Day columns** — one column per calendar day in the trip (startDate → endDate inclusive). Each column header shows the date ("Mon Jul 15") and a time/budget summary bar at the bottom.

**Attraction assignment**:
- Unassigned attractions appear in an "Unscheduled" sidebar on the left
- Each attraction card in the column shows: name, type icon, and two duration values:
  - "Recommended: 2h" (grey, from `durationValue`/`durationUnit`)
  - "Planned: [input]" — editable time input that sets `actualDurationValue`/`actualDurationUnit`
- "Assign to day" button (or simple dropdown) on each unscheduled attraction lets the user pick a date

**Per-day summary** (shown at the bottom of each day column):
- Total planned hours for the day
- Visual indicator if >8h planned (warning colour)

**Budget view** (optional, shown if trip has a budget):
- Distribute total budget across days (budget ÷ days = daily budget)
- Show sum of attraction prices for each day vs the daily budget

**Actions**:
- "Assign" button on each unscheduled attraction → select day → calls `PUT /api/attractions/[id]` with `{ plannedDate }`
- "Unassign" → sets `plannedDate = null`
- Planned duration input → `PUT /api/attractions/[id]` with `{ actualDurationValue, actualDurationUnit }` on blur

### Non-functional
- Responsive: on mobile, days stack vertically (single-column scroll)
- No drag-and-drop required (button-based assignment is sufficient)
- Accessible: day column headings use `<h3>`, attraction cards have `aria-label`

## Constraints
- CSS Modules only, no inline styles
- No DnD library
- Changes are saved immediately via PUT (no "save all" button)
- The Mongoose Attraction schema must be updated; existing attractions will have `null` for the new fields

## Out of scope
- Automatic scheduling / AI suggestions
- Sharing the itinerary as a PDF or link
- Real-time collaboration (multi-user editing same trip simultaneously)
- Google Maps integration for route optimisation
