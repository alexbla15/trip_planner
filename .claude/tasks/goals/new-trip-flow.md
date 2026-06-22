# Goal: New Trip Creation Flow

Status: in progress

End-to-end flow for creating a new trip — from filling in trip details to building an itinerary of attractions.

## Tasks
- [x] .claude/tasks/new-trip-page.done.md
- [ ] .claude/tasks/new-trip-attraction-picker.md

## Plan
1. **New Trip Page (general details)** — builds the `/new-trip` route, wires the navbar button, and delivers the trip details form. Must ship first because it creates the page shell that the attraction picker lives inside.
2. **New Trip Attraction Picker** — adds the three-view (map / table / calendar) attraction picker to the page. Depends on the page shell and the mood-tag + attraction types already existing.
