# Task: Profile Page — Personal Analytics Cards

Status: intake

Track: A
Track reason: new UI surface — stat cards and charts scoped to the current user, mirroring the analytics page pattern

## Problem
The `/profile` page currently shows basic account info but no meaningful trip/attraction statistics for the logged-in user. The analytics page shows global stats; users want a personal view of their own data.

## Goal
The profile page includes a personal analytics section with stat cards and charts specific to the current user's trips and attractions.

## Requirements
- Display personal stat cards: total trips, total attractions scheduled, total countries visited, total spend (in user's preferred currency)
- Mirror the visual card pattern from the analytics page (same card shell, icon circle, number, label)
- At minimum: trips by mood tag (bar or donut), top cities visited (list or small map), attractions by type (donut)
- Data is fetched from existing analytics API endpoints filtered by the current user's `ownerId`, OR from a new lightweight `/api/users/me/stats` endpoint if the existing endpoints don't support user scoping
- Accessible to the logged-in user only — unauthenticated users see a prompt to log in

## Constraints
- CSS Modules only — no inline styles
- Reuse analytics card and chart components where possible — do not duplicate CSS
- Charts: recharts (already used in analytics page)

## Out of scope
- Admin-level views of other users' profiles
- Editing profile info from this section
