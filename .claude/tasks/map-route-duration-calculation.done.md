# Task: Fix Car and Walk Route Duration Not Calculating on Map

Status: done

Track: B
Track reason: Bug fix — route duration calculation broken for car and walk travel modes

## Problem
The map's car and walk routing features do not calculate or display the travel duration. The route path may draw correctly but the duration is missing or shows zero/undefined. This makes the feature useless for trip planning.

## Goal
Selecting car or walk mode on the map calculates and displays the correct travel duration for the route between stops.

## Requirements
- Car mode must return and display estimated driving duration
- Walk mode must return and display estimated walking duration
- Duration should be shown in a human-readable format (e.g. "12 min", "1 h 5 min")
- Fix should be in `routeService.ts` or wherever the routing/duration logic lives
- No regressions to the existing route path drawing

## Constraints
- Fix must be in the existing routing service — do not switch routing providers without good reason
- If the external routing API does not return duration, investigate whether the correct response fields are being read

## Out of scope
- Changing the map UI layout
- Adding new travel modes beyond car and walk

## Implementation Notes
- Files modified: `src/app/trips/[id]/routeService.ts`
- Root cause 1: `if (data.trip?.status !== 0) return null` — Valhalla omits the `status` field in some response versions; `undefined !== 0` evaluates `true`, silently discarding a valid leg and returning null.
- Fix: Removed the status check entirely; now checks `data.trip?.legs?.[0]` directly. If there's a leg, we proceed — `res.ok` already gates HTTP-level errors.
- Root cause 2 (secondary): `fmt()` always rendered minutes (e.g. "120 min" for 2 h). Improved to show "2 h" or "1 h 5 min" for routes ≥ 60 min.
- No swagger changes — no API routes added or modified.
- Deviations from brief: none
- New design tokens used: none

## Completion Summary
Fixed car and walk route duration not displaying on the trip map. Root cause was a strict `status !== 0` guard in `fetchValhallhaLeg` that discarded valid Valhalla responses when the `status` field was absent. Replaced with a direct legs check. Also improved the duration formatter to show hours (e.g. "1 h 5 min" instead of "65 min"). Confirmed by user on 2026-07-05.
