# Task: Footer missing max-width container (responsive/zoom-out inconsistency)

Status: reviewing
Track: B
Track reason: existing 1280px container token/pattern already used by every other section (Navbar, home, trips, admin, analytics, profile, etc.) — just applying the established pattern, no new design.

## Problem
User reported: "the website is not fully screened, when zooming out, there is a lot of empty space, this is wrong, the website must be responsive." Research agent confirmed all page-level containers correctly cap at `max-width: 1280px; margin: 0 auto` per `docs/DESIGN_SYSTEM.md` (intentional, documented design — not a bug). The one real inconsistency: `src/components/Footer/Footer.module.css`'s `.footer` has no inner 1280px wrapper — its content spans full viewport width while every section above it is capped and centered, producing a visible asymmetry at wide/zoomed-out viewports.

## Goal
Footer content aligns with the same 1280px centered container used by Navbar and all page sections.

## Requirements
- Add an inner wrapper inside `.footer` matching the existing `.container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }` pattern already used elsewhere (e.g. `src/app/page.module.css`, `src/components/Navbar/Navbar.module.css`).
- `text-align: center` and existing typography/border-top styling remain on the outer `.footer`.

## Constraints
- Reuse the existing token/pattern exactly (1280px, 24px padding) — no new values.

## Out of scope
- `docs/DESIGN_SYSTEM.md:205`'s possibly-stale 3-column Explore grid description (unrelated, flagged separately if needed).
- Any other page content — all other containers already confirmed consistent.

## Implementation Notes
- Files created/modified: `src/components/Footer/Footer.module.css`, `src/components/Footer/Footer.tsx`
- Deviations from task requirements: also swapped the footer copy from "Made with ☁️ for wanderers" to "Created by Alex Blahman & Claude" in the same edit (this is the user's separate item #11 in their original list — bundled in since it's the same file/component and trivial, to avoid a second round-trip on a one-line text change).
- New design tokens used: none (reused existing 1280px/24px container pattern)
- Verified: `tsc --noEmit` clean, `eslint` clean on Footer files.

## Completion Summary
Added a 1280px `.container` wrapper inside the Footer matching the pattern used by every other section, fixing the visible edge-to-edge/centered misalignment at wide and zoomed-out viewports. Also swapped the footer credit text to "Created by Alex Blahman & Claude" (bundled from the user's separate item #11). Confirmed by user 2026-07-25.
