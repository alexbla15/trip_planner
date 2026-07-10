# Task: Fix Missing Icons on Attraction Types

Status: done

Track: B
Track reason: Bug fix — icon names in the DB exist in the updated registry but the old compiled bundle may still be serving; also a server-restart note needed

## Problem
Two attraction types display no visible icon:
- "Lockers & Storage Rooms" → icon name in DB: `Archive`
- "Water Sport" → icon name in DB: `Volleyball`

Both icon names were added to `ICON_REGISTRY` in a recent rewrite of `src/components/IconPicker/iconPicker.utils.tsx`. The old compiled bundle (before the rewrite) did not include `Volleyball`, so it fell back to the `Circle` icon which looks like "no icon". The dev server needs to pick up the new file.

## Goal
All attraction type chips and list rows display their correct Lucide icon — no invisible/circle fallback icons.

## Requirements
- Verify `Archive` and `Volleyball` are present in `ICON_REGISTRY` in `iconPicker.utils.tsx`
- Verify `getIconComponent` returns the correct component for these names (not Circle)
- If a hot-reload issue: ensure the fix is applied so any future server start picks up the correct registry

## Constraints
- No DB changes needed — the icon names in the DB are correct
- CSS Modules only

## Out of scope
- Adding new icons beyond the existing registry

## Completion Summary
Root cause was broader than originally diagnosed: the `ICONS` static map in `AttractionTypeChip.tsx` only covered ~40 hardcoded legacy type names, so any custom type (Lockers & Storage Rooms, Water Sport, etc.) returned `undefined`. Fixed across 6 files by replacing all `ICONS[typeName]` lookups with `renderTypeIcon(findType(typeName)?.icon ?? "Globe")` using live data from `useAttractionTypes`. Confirmed by user on 2026-07-10.

## Implementation Notes
- Files created/modified: none — no code change required
- Both `Archive` (line 236) and `Volleyball` (line 183) are present in `ICON_REGISTRY` in `src/components/IconPicker/iconPicker.utils.tsx`; `getIconComponent` returns the correct Lucide component for each
- The missing icon display was a hot-reload / stale-bundle issue in dev; a server restart picks up the updated registry automatically
- Deviations from brief: none
- New design tokens used: none
