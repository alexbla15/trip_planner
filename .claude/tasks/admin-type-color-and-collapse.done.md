# Task: Color attraction type text instead of category dot; make each type category collapsible

Status: done
Track: B
Track reason: Reuses two existing patterns verbatim — the CSS-custom-property color technique just applied to Travel Moods, and SectionCard's own collapse/chevron CSS pattern — applied one level down to per-category subsections in the Attraction Types card.

## Problem
In `/admin`'s "Attraction Types" card (`src/app/admin/AdminClient.tsx`, ~line 670-684), each category section header shows a plain color swatch (`.categoryDot`, ~line 677) next to the category name, while individual type rows underneath render with no color at all despite `AttractionTypeRecord` already carrying a `color` field per type. Additionally, each category's list of types is always fully expanded, which gets long with many categories.

## Goal
- The colored dot in each category header is removed; instead, each attraction type's own name text is colored using that type's `color` field.
- Each category's type list is independently collapsible/expandable (separate from the outer "Attraction Types" `SectionCard`, which is already collapsible as a whole).

## Requirements
- Remove `<span className={styles.categoryDot} style={{ background: first?.color }} />` from the category header at ~line 677 in the Attraction Types card only (the `Attraction Categories` card's own dot at ~line 597 is untouched — out of scope).
- Color the category name heading itself (the `<h3>{cat}</h3>` in the section header, not the individual type rows underneath) using that category's color (`first?.color`), via the same CSS-custom-property `style` convention already used for Travel Moods colors (no raw inline color values, no per-value class map).
- Add a collapse toggle to each category section header: click toggles that category's type list open/closed, with a rotating chevron and `aria-expanded`, mirroring `SectionCard`'s own `collapsible` implementation (`src/components/SectionCard/SectionCard.tsx`/`.module.css`) at the per-category level. Default open (never start surprise-collapsed).

## Constraints
- Reuse `SectionCard`'s existing collapse CSS technique (`grid-template-rows` transition) rather than inventing a new animation.
- No changes to the "Attraction Categories" card.

## Out of scope
- Changing "Travel Moods" (already colored in a prior task).

## Implementation Notes
- Files modified:
  - `src/app/admin/AdminClient.tsx` — added `collapsedTypeCategories` state + `toggleTypeCategory`; category header in the Types card is now a `<button>` (removed `.categoryDot`) with `aria-expanded`/`aria-controls` and a rotating `ChevronDown`; the category name `<h3>` uses `.categoryNameColored` with `style={{ "--type-color": first?.color }}`; each category's type list is wrapped in a `SectionCard`-style collapse container (`.categoryCollapse`/`.categoryCollapseInner`).
  - `src/app/admin/AdminClient.module.css` — `.categoryHeader` converted to a button-safe style (border:none, cursor:pointer, text-align:left); added `.categoryChevron`/`.categoryChevronCollapsed`/`.categoryCollapse`/`.categoryCollapseClosed`/`.categoryCollapseInner` (mirroring `SectionCard.module.css`'s grid-template-rows collapse technique) and `.categoryNameColored` (reads `var(--type-color)`); removed the now-unused `.categoryName` rule; `.categoryDot` kept (still used by the separate Attraction Categories card).
- Deviations from task requirements: first pass colored individual type-row names instead of the category heading; corrected per user follow-up mid-review to color the category name only, leaving individual type rows unstyled.
- New design tokens used: none.
- Follow-up (same session): user asked for the identical dot-removal + colored-text treatment on the "Attraction Categories" card. Removed `.categoryDot` (now unused everywhere) and its usage at ~line 608; each category row's name now uses `.typeNameColored` with `style={{ "--type-color": cat.color }}`, same CSS-custom-property convention. No collapse behavior added there — it's a flat list, not grouped into subsections like the Types card.
- Follow-up (same session): `.formCard` (the inline Category/Type/Mood add-or-edit form, `AdminClient.module.css`) had no bottom spacing and sat flush against whatever rendered next (the items list below it). Added `margin-bottom: 16px`.
- `npx tsc --noEmit` passes with no errors.

## Completion Summary
In `/admin`, both the Attraction Types and Attraction Categories cards now color the category/name text itself (via a `--type-color` CSS custom property) instead of showing a separate dot swatch, and each category's type list in the Types card is independently collapsible with a rotating chevron, mirroring `SectionCard`'s existing collapse pattern. Also fixed `.formCard` sitting flush against the following container by adding bottom margin. Confirmed by user, closed 2026-07-26.
