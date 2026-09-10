# Task: Grid pagination silently snapping back to page 1 ("can't go forward")

Status: done
Track: B
Track reason: bug fix — race condition, no new UI surface

## Problem
Reported live against production (`/explore?country=Iceland&verified=unverified`):
clicking "Next" in grid view sometimes appeared to do nothing / snap back. Root cause: none
of Explore's three data-fetching `useEffect`s (world-view `cities` aggregate, city-scoped
`cityAttractions`, country-scoped `countryAttractions`) had a stale-response guard. When
`token` flips from `null` to its real value once auth hydrates — which happens shortly
after these effects first fire on page load — the effect re-runs while the previous
(anonymous) request may still be in flight. For the two single-shot fetches this risked a
stale response overwriting a newer one; for the country-attractions fetch specifically
(which streams and *appends* pages via a callback), both the stale and the new request's
page callbacks kept firing and appending into the same `countryAttractions` array,
transiently inflating the count past the real total. `gridTotalPages` derives from that
count, so it would briefly report an extra page — then, once the stale request's data
either got superseded or fully arrived, the count dropped back to the true total,
`gridTotalPages` shrank, and the page-clamp effect
(`setGridPage(p => Math.min(p, gridTotalPages))`) silently pulled the user back to page 1.
Reproduced live: sampling the pagination label repeatedly on load showed it fluctuate
before settling, and clicking Next while it was in that transient inflated state didn't
stick.

## Goal
Grid pagination advances reliably and never reverts once clicked, regardless of when auth
hydrates or how fast the underlying data is still streaming in.

## Requirements
- All three fetch effects (`cities`, `cityAttractions`, `countryAttractions`) in
  `src/app/explore/ExploreClient.tsx` guard every state-setting callback with a `cancelled`
  flag set `true` in the effect's cleanup — the standard "ignore stale async work" pattern
- The country-attractions effect's streaming `onPage` callback also checks `cancelled`,
  since it's the one whose repeated-append behavior caused the actual inflate-then-clamp
  symptom

## Constraints
- Don't change the streaming/pagination logic itself (`getAttractionsByCountry`,
  `gridTotalPages` derivation) — only prevent a superseded request from writing state at all

## Out of scope
- Any other Explore behavior

## Implementation Notes
- Files created/modified: src/app/explore/ExploreClient.tsx (added `cancelled` flag + cleanup to all three fetch effects: `cities`, `cityAttractions`, `countryAttractions`; every `.then`/`.catch`/`.finally` and the streaming `onPage` callback now check it before calling setState)
- Deviations from task requirements: none
- New design tokens used: none
- Verification: tsc clean; eslint identical to pre-existing baseline (17 problems, confirmed via prior sessions' established baseline for this file — no new issues); reproduced the bug live against production first (sampled pagination state repeatedly on load, observed fluctuation from "Page 1 of 2" down to no-pagination as the count settled from a transient 21 down to a true 20); after the fix, verified locally that the count is now stable across every sample from 500ms to 7000ms post-load (no fluctuation), and that clicking Next repeatedly on a large country (Germany, 34 real pages) advances 1->2->3 with zero snap-back even while later pages are still streaming in

## Completion Summary
Fixed a race condition where auth hydrating mid-fetch caused Explore's country-attractions count to transiently inflate then settle, silently clamping grid pagination back to page 1. Added stale-request guards to all three Explore data-fetching effects. Verified against production repro and locally. Auto-closed per the user's standing "commit and push when done" instruction.
