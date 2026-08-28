# Goal: New Trip Creation Flow

Status: done

End-to-end flow for creating a new trip — from filling in trip details to building an itinerary of attractions.

## Tasks
- [x] .claude/tasks/new-trip-page.done.md
- [x] .claude/tasks/attraction-picker-modal-type-filter.done.md

## Plan
1. **New Trip Page (general details)** — builds the `/new-trip` route, wires the navbar button, and delivers the trip details form. Must ship first because it creates the page shell that the attraction picker lives inside.
2. **New Trip Attraction Picker** — adds an attraction picker to the page so a trip can be seeded with attractions at creation time. Depends on the page shell and the mood-tag + attraction types already existing.

## Note (2026-08-28)
The originally-planned second task, `new-trip-attraction-picker.md`, was never created as a standalone file — the picker shipped via `AttractionPickerModal` (a single searchable modal, not the originally-envisioned three-view map/table/calendar picker) and is live in `NewTripClient.tsx` today (`AttractionPickerModal` + "Add Attraction"/"Add Another Attraction" buttons). Corrected the checklist to point at the task that actually documents that component and closed this goal as done.
