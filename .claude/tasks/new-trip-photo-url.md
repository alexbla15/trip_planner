# Task: New Trip — Add Photo URL Field

Status: intake

Track: B
Track reason: adding a standard text input to an existing form — no new visual pattern needed

## Problem
When creating a new trip, there is no way to attach a cover photo URL. Users must edit the trip after creation to add one, which is a friction point.

## Goal
The "New Trip" form includes an optional cover photo URL field that saves to the trip on creation.

## Requirements
- Add an optional "Cover photo URL" text input to the new trip form
- Field is validated as a URL format (or left empty) before submit
- Value is sent in the POST body to the trips API on form submission
- The trips API already accepts a `coverImage` field — wire the form input to that field
- Show a small preview thumbnail if a valid URL is entered (optional but ideal)

## Constraints
- CSS Modules only — no inline styles
- Use existing form field styles from the new-trip page

## Out of scope
- File upload / image hosting — URL only
- Changing the trips API schema
