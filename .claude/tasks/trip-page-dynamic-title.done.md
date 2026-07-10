# Task: Dynamic Page Title for Trip Detail Page

Status: done

Track: B
Track reason: Logic change — set dynamic <title> from trip data; no new visual surface

## Problem
The `trips/[id]` page shows a generic app title in the browser tab. Users can't tell which trip they're on from the tab bar, and sharing a link gives recipients no title context.

## Goal
The browser tab and `<title>` for `trips/[id]` shows the trip's name (e.g. "Paris Weekend · Trip Planner").

## Requirements
- Use Next.js `generateMetadata` (App Router) to set `title` dynamically from the trip name
- Fallback title if the trip can't be fetched: "Trip · Trip Planner"
- Format: `"<Trip Name> · Trip Planner"` (matches the app's existing metadata pattern)
- The trip name must be fetched server-side for SSR — cannot rely on client state

## Constraints
- App Router only — no `<Head>` from `next/head`
- The page at `src/app/trips/[id]/page.tsx` is the server component entry point — add `generateMetadata` there
- Must not break the existing `TripDetailClient` client component

## Out of scope
- Dynamic OG image or social sharing cards

## Completion Summary
`generateMetadata` in `src/app/trips/[id]/page.tsx` updated to fetch the trip name server-side via direct DB call. Browser tab now shows `"<Trip Name> · Trip Planner"` with a fallback of `"Trip · Trip Planner"`. Confirmed by user on 2026-07-10.

## Implementation Notes
- Files created/modified: `src/app/trips/[id]/page.tsx`
- `generateMetadata` now calls `dbConnect()` + `Trip.findById(id).select("name").lean()` server-side; returns `"<Trip Name> · Trip Planner"` with fallback `"Trip · Trip Planner"` on any error or missing trip
- `mongoose.isValidObjectId(id)` guards against invalid ObjectId strings before querying
- The `other: { tripId }` field and stale comment were removed since the real title is now set server-side
- Deviations from brief: none
- New design tokens used: none
