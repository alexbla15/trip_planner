# Task: Fix scroll clipping in attraction modal result lists

Status: done
Track: B
Track reason: Bug fix — broken behavior (last item clipped), not a new visual pattern; fix is a CSS spacing adjustment.

## Problem
In the "add attraction" modals, the scrollable results list clips the last item — it's partially hidden behind the modal's bottom edge, so users can't fully see (or comfortably click) the final result without extra scrolling past where the scrollbar suggests content ends.

## Goal
The last item in any scrollable attraction results list is fully visible and has the same visual breathing room as the items above it.

## Requirements
- Add adequate bottom padding/spacing to the scrollable results container(s) so the last item is fully visible and not flush against the modal edge.
- Apply the fix everywhere this pattern occurs — confirmed locations:
  - `src/components/AttractionSearchModal/AttractionSearchModal.module.css` (`.body`, ~line 106-110)
  - `src/components/CategoryAttractionsModal/CategoryAttractionsModal.module.css` (`.body`, ~line 102)
  - Check `src/components/AttractionPickerModal/` for the same `.body`/list rule and fix if affected.
- No change to modal max-height, header, or footer behavior.

## Constraints
- CSS-only fix expected; no component logic changes.
- Use existing spacing tokens from `docs/DESIGN_SYSTEM.md`, not hand-coded pixel values.

## Out of scope
- Redesigning the modal layout or scroll affordances (e.g. scroll shadows/fade indicators).

## Implementation Notes
- Files created/modified:
  - `src/components/AttractionSearchModal/AttractionSearchModal.module.css` — added `padding-bottom: 8px` to `.body`
  - `src/components/CategoryAttractionsModal/CategoryAttractionsModal.module.css` — added `padding-bottom: 8px` to `.body`
  - `src/components/AttractionPickerModal/` checked — already has `padding: 8px` on `.list` (all sides), no fix needed
- Deviations from brief: none
- New design tokens used: none — the codebase has no `--space-*` token scale; padding values throughout `AttractionSearchModal`/`CategoryAttractionsModal` are hand-set px matching existing row padding (e.g. `10px 16px`), so `8px` follows that established (untokenized) convention rather than introducing a new one.

## Completion Summary
Added bottom padding to the scrollable results containers in `AttractionSearchModal` and `CategoryAttractionsModal` so the last result row is fully visible instead of being clipped by the modal edge; confirmed `AttractionPickerModal` already had adequate padding. Confirmed by user, closed 2026-07-26.
