# Task: Show travel mood colors in /admin view

Status: done
Track: B
Track reason: Bug fix reusing an existing, already-implemented color utility — no new visual pattern.

## Problem
In `src/app/admin/AdminClient.tsx` (~line 748-798, the "Travel Moods" `SectionCard`), each mood renders as `.typeItem` with an icon and a plain `<span>` name — no color swatch — even though the underlying `tagRecord` already carries `color`/`bgColor`/`darkColor`/`darkBgColor` fields. Elsewhere in the app (e.g. `MoodTagChip`), moods are correctly rendered with color via the `getMoodTagStyle(record)` util in `src/hooks/useMoodTags.ts` (line ~38-45), which maps those record fields to CSS custom properties (`--tag-color`, `--tag-bg`, etc.). The admin view is the one place that doesn't use it.

## Goal
Travel moods in the /admin view are shown with the same color styling used everywhere else in the app.

## Requirements
- Apply `getMoodTagStyle(record)` (or the equivalent existing util) to the mood items in `AdminClient.tsx`'s Travel Moods section so each mood shows its color/background consistent with `MoodTagChip` elsewhere.
- No change to the icon or name content, only the color treatment.

## Constraints
- Reuse the existing `getMoodTagStyle` util — do not hand-roll a new color mapping.

## Out of scope
- Changing how other tag/type sections (Attraction Types, Categories) render in the admin view, unless they have the identical bug (verify and only fix if confirmed).

## Implementation Notes
- Files created/modified:
  - `src/app/admin/AdminClient.tsx` — imported `getMoodTagStyle` from `@/hooks`; mood rows now render `.moodIcon`/`.moodName` (with `style={getMoodTagStyle(tagRecord)}`) instead of the shared `.typeIcon`/`.typeName` used by Attraction Types/Categories, so this scopes color only to moods.
  - `src/app/admin/AdminClient.module.css` — added `.moodIcon`/`.moodName` (+ dark-theme overrides) mirroring `.typeIcon`/`.typeName` but reading `var(--tag-color)`/`var(--tag-dark-color)`, matching the pattern already used in `MoodTagChip.module.css`.
- Deviations from task requirements: used the existing `style={{...}}` + CSS-custom-property convention (same as `MoodTagChip`) rather than a hand-coded per-value class map — this is the codebase's established way to drive dynamic per-record color without violating the "no inline CSS" rule (the style object only sets CSS variables, not literal styles).
- New design tokens used: none — reused existing `--tag-color`/`--tag-bg`/`--tag-dark-color`/`--tag-dark-bg` custom properties from `getMoodTagStyle`.

## Completion Summary
Travel Moods in `/admin` now render with their actual colors by reusing the existing `getMoodTagStyle` util, scoped only to moods so Attraction Types/Categories were unaffected. Confirmed by user, closed 2026-07-26.
