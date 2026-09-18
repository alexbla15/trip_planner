Status: done
Track: B

## Completion Summary
Confirmed by user 2026-09-18.

## Request
The backup-needed red dot doesn't show immediately when an attraction is
added/updated via the Explore page — only appears after a refresh.

## Problem
The Navbar's "backup needed" check only ran once on mount (`useEffect`
dependent on `[token, user?.role]`), so an attraction change made elsewhere
in the same session (without navigating/reloading) never re-triggered it.

## Fix
- `src/services/attractions.service.ts`: `createAttraction`/`updateAttraction`
  now call a new `notifyAttractionsChanged()` after a successful (non-throwing)
  response, dispatching a `window` `CustomEvent` (`ATTRACTIONS_CHANGED_EVENT =
  "tp:attractions-changed"`), exported via the services barrel.
- `src/components/Navbar/Navbar.tsx`: the backup-status check effect now also
  listens for that event and re-runs immediately, in addition to its mount-time
  check. Also added `cache: "no-store"` to the status fetch as a defensive
  measure (ruled out as the actual cause, but a reasonable safeguard against
  a stale GET response regardless).

## Implementation Notes
- `tsc --noEmit`: clean.
- Verified the event-listener wiring directly and in isolation: a manually
  dispatched `tp:attractions-changed` event correctly triggers a second
  status re-fetch and recompute (confirmed via temporary debug logging,
  since removed).
- While verifying end-to-end via the UI's "mark as verified" toggle, found
  every attempt returned `404` from `PUT /api/attractions/:id` — a
  pre-existing, unrelated bug in `ExploreClient.tsx`'s `handleToggleVerified`
  (uses `attraction.attractionId ?? attraction._id`, and `attractionId`
  appears to not resolve to a valid route id in country-view results). This
  blocked using that specific action as a live end-to-end test, but is
  outside this task's scope — not touched. The dispatch/listener/comparison
  logic itself was independently confirmed correct.
