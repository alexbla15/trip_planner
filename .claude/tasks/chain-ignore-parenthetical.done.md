# Task: "Other locations" chain matching should ignore parenthetical suffixes

Status: done
Track: B
Track reason: bug fix — broken matching logic, no new UI surface

## Problem
The detail modal's "Other locations in {city}" feature (branches of the same chain, e.g.
McDonald's) matched on the attraction's exact full name. A chain whose individual branches
are disambiguated with a parenthetical suffix — e.g. "Levain Bakery (Williamsburg)" vs.
"Levain Bakery (UWS)" — was broken twice over: the server-side search query was built from
the FULL name including the parenthetical (so it would never even find a sibling with a
different suffix), and the client-side filter required an exact full-name match on top of
that. Two real branches of the same chain never recognized each other.

## Goal
Branches of the same chain that differ only by a parenthetical disambiguator (neighborhood,
mall, etc.) are correctly recognized as the same chain and listed under "Other locations."

## Requirements
- New `stripParenthetical(name)` helper (`AttractionDetailModal.utils.ts`) — removes any
  `(...)` segment and collapses the whitespace left behind
- The "other locations" fetch (`AttractionDetailModal.tsx`) sends the stripped base name as
  the search query (not the full name), and the result-matching filter compares stripped,
  lowercased names on both sides

## Constraints
- Don't touch the exact-duplicate-name check at attraction creation — two branches of the
  same chain legitimately have different full names and must both be allowed to exist as
  separate documents
- Don't expand scope to fixing the pre-existing (unrelated) lack of regex-escaping in the
  server's `q` search — out of scope, not what was asked

## Out of scope
- Any other "same chain" concept elsewhere in the app (none found — this was the only
  occurrence, confirmed via a full-codebase grep for the exact-match pattern)

## Implementation Notes
- Files created/modified:
  - src/components/AttractionDetailModal/AttractionDetailModal.utils.ts (new `stripParenthetical` helper)
  - src/components/AttractionDetailModal/AttractionDetailModal.tsx (other-locations fetch effect uses the stripped base name for both the search query and the result-matching filter)
- Deviations from task requirements: none
- New design tokens used: none
- Verification: tsc clean; eslint identical to pre-existing baseline (confirmed via prior sessions' established baseline for this file); functionally verified with `tsx` directly against the real source — "Levain Bakery (Williamsburg)" and "Levain Bakery (UWS)" both strip to "Levain Bakery" and match case-insensitively; extra whitespace left behind after stripping collapses correctly; a name with no parentheses passes through unchanged

## Completion Summary
Fixed "Other locations in {city}" chain matching to ignore parenthetical branch disambiguators (e.g. "Levain Bakery (Williamsburg)" now correctly matches "Levain Bakery (UWS)"). Verified functionally. Confirmed by the user 2026-09-11.
