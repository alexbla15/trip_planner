# TripPlanner — Product Requirements Document

Grounded in the product vision already captured in [`idea.md`](./idea.md); this document
turns that vision into scoped, verifiable requirements against the app as actually built.

## Problem statement

Existing trip-planning tools (Wanderlog, TripIt, and spreadsheets/notes apps used in their
place) push raw logistics — addresses, opening hours, confirmation numbers — without
helping travelers reason about *feel* (what kind of experience a place offers) or *fit*
(whether a day's plan is geographically/time realistic). Confirmations end up scattered
across email; itineraries end up either half-empty or over-packed because there's no shared
source of truth for what's already scheduled.

## Goals

1. Give a trip a single place to hold everything scheduled on it — attractions, flights,
   accommodation stays, and ad-hoc time blocks — on one calendar.
2. Let attractions be discovered and reused via mood/category tags, not just raw text search.
3. Support planning as a group: a trip has one owner and any number of collaborators, all
   editing the same itinerary.
4. Keep a rough, upfront budget estimate (multi-currency) visible without extra bookkeeping.

## Non-goals (explicitly out of scope)

- Real-time collaborative editing (e.g. live cursors/conflict resolution) — collaborators
  share a trip, but edits are last-write-wins, not merged.
- Payment processing or actual booking of flights/hotels — TripPlanner tracks bookings
  users already made elsewhere; it does not book anything.
- Native mobile apps — the web app is responsive, but there's no iOS/Android client.
- Public API rate limiting / API keys for third-party consumers — the documented REST API
  (see [`SPEC.md`](./SPEC.md)) is intended for this app's own frontend.

## Target users

- **Backpackers / multi-city travelers** who need attractions and transit ordered
  chronologically across several destinations in one trip.
- **Group/family trip organizers** who need one shared, editable itinerary instead of a
  group chat full of screenshots.
- **Budget-conscious travelers** who want a running cost estimate, in their own currency,
  before departure.

## Functional requirements

| # | Requirement | Status |
|---|---|---|
| F1 | Users can register, log in, and log out (JWT session) | ✅ implemented |
| F2 | Users can create, view, edit, and delete trips they own | ✅ implemented |
| F3 | Trips can be marked private or public; public trips are visible (read-only) to anyone via Explore | ✅ implemented |
| F4 | Trip owners can invite/remove collaborators by email; collaborators can edit the itinerary | ✅ implemented |
| F5 | Users can search a shared attraction database by country, city, or category | ✅ implemented |
| F6 | Users can add an existing attraction to a trip, or create a new one inline | ✅ implemented |
| F7 | Attractions can be scheduled on a per-day calendar with date/time/duration | ✅ implemented |
| F8 | The calendar supports flights and free-form time slots that aren't tied to a shared attraction | ✅ implemented |
| F9 | The calendar supports overnight-spanning blocks and auto-fits its visible day window | ✅ implemented |
| F10 | Residences (hotels/stays) can be reused across trips with different stay dates per trip | ✅ implemented |
| F11 | Trips track a budget/currency; attraction prices roll up toward it | ✅ implemented |
| F12 | Users can browse public trips for inspiration (Explore) | ✅ implemented |
| F13 | Users can view personal and global usage analytics | ✅ implemented |
| F14 | Admins can manage the shared taxonomy (attraction types/categories, mood tags) | ✅ implemented |

## Non-functional requirements

| # | Requirement | Status |
|---|---|---|
| N1 | Passwords are hashed (bcrypt), never stored/logged in plaintext | ✅ |
| N2 | Sessions use signed JWTs; protected routes reject missing/invalid/expired tokens with 401 | ✅ |
| N3 | Every API route returns structured JSON with a correct, consistent HTTP status on both success and error | ✅ (`src/lib/withApiHandler.ts`) |
| N4 | The app is usable on mobile and desktop viewports | ✅ (CSS Modules + media queries per component; see [`DESIGN.md`](./DESIGN.md) for the honest caveat on breakpoint consistency) |
| N5 | List endpoints that can grow unbounded support pagination | ✅ (`/api/attractions`, `/api/explore`) |
| N6 | The app is deployable with zero required config changes to Vercel, and has an alternative container-based deployment path | ✅ (`Dockerfile`, `render.yaml`) |
| N7 | All configuration secrets are environment variables, documented, none hardcoded | ✅ (`.env.example`) |

## Success metrics

Since this is a single-team project without production analytics infrastructure, "success"
is scoped to what's verifiable from the app itself rather than external growth metrics:

- A user can go from registration to a fully scheduled multi-day trip (attractions + at
  least one flight or residence) without hitting a dead end or silent failure.
- Every documented endpoint in [`SPEC.md`](./SPEC.md) returns the documented status/shape
  for both the success and the primary failure case (verified via `/api-docs` + manual
  testing).
- `/api/analytics/summary` and `/api/analytics/global` reflect real usage (categories,
  moods, trip counts) as a proxy for "the data model is actually being exercised, not just
  stored."

## Scope boundaries

In scope for the current release: everything in **Functional requirements** above, plus the
production-readiness work described in [`SPEC.md`](./SPEC.md) (error handling, service
layer for trips/attractions, pagination, deployment config, API docs). Out of scope for this
release: the **Non-goals** list above, and any backend beyond Next.js Route Handlers (no
separate microservice split is planned — the two-domain service-layer extraction in
`src/lib/services/` is judged sufficient for the app's current size).
