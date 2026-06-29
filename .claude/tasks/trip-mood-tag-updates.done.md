# Task: Update Trip Mood Tag Categories

Status: done

Track: B
Track reason: content/data change + CSS class additions; no new layout or interaction pattern

## Problem
The current mood tag set doesn't reflect the travel styles users actually care about. Two tags need removal/renaming and five new travel niches need to be added.

## Goal
The mood tag list is updated to: Hidden Gems removed (renamed to Luxury), Instagrammable removed, and five new tags added — giving users a richer set of trip moods that match real travel identities.

## Required Changes

### Tag list after update
Remove: `"Hidden Gems"`, `"Instagrammable"`  
Rename: `"Hidden Gems"` → `"Luxury"`  
Keep unchanged: `"Vibrant Nightlife"`, `"Cultural Heritage"`, `"Adventure"`, `"Beach Life"`, `"Food & Wine"`  
Add: `"Relaxation & Wellness"`, `"Couples & Romantic"`, `"Family"`, `"Backpacking & Budget"`, `"Cruises"`

### Files to update

**`src/components/MoodTagChip/MoodTagChip.constants.ts`**
- Replace `"Hidden Gems": "tagHiddenGems"` with `"Luxury": "tagLuxury"`
- Remove `"Instagrammable": "tagInstagrammable"`
- Add entries for each new tag using kebab-derived class names:
  - `"Relaxation & Wellness": "tagRelaxationWellness"`
  - `"Couples & Romantic": "tagCouplesRomantic"`
  - `"Family": "tagFamily"`
  - `"Backpacking & Budget": "tagBackpackingBudget"`
  - `"Cruises": "tagCruises"`
- Replace icon for old "Hidden Gems" (Gem icon) → keep Gem for "Luxury"; remove Camera icon for "Instagrammable"
- Add Lucide icons for new tags (choose sensible ones — e.g., Sparkles or Heart for Relaxation & Wellness, Heart for Couples & Romantic, Baby or Users for Family, Backpack or Wallet for Backpacking & Budget, Anchor or Ship for Cruises)

**`src/components/MoodTagChip/MoodTagChip.module.css`**
- Remove `.tagHiddenGems`, `.tagInstagrammable` classes
- Add `.tagLuxury` class (reuse a gold/amber tone — e.g., `background: #F59E0B22; color: #B45309; border-color: #F59E0B44`)
- Add CSS classes for the 5 new tags with distinct, readable color pairs using the same `background / color / border-color` pattern as existing tags

**`src/components/MoodTagButton/MoodTagButton.tsx`** (and its `.module.css`)
- Apply the same changes to the tag button variant if it has its own tag list (check if it duplicates the constants or imports from MoodTagChip.constants.ts)

**`src/app/new-trip/NewTripClient.tsx`** and **`src/app/trips/[id]/edit/EditTripClient.tsx`**
- Update the hard-coded moods array (if any) that populates the mood selector, to include the new tags and remove the old ones

**`src/types/trip.ts`**
- If `moods` is typed as a string literal union, update the union. If it's `string[]`, no change needed.

**Mock data** (`src/data/mockTrips.ts`, `src/data/mockExplore.ts`)
- Replace any references to `"Hidden Gems"` or `"Instagrammable"` with valid new tags

## Constraints
- CSS Modules only — no inline styles
- Follow the existing tag color pattern: soft background tint, matching darker text, matching border
- Do not rename the MoodTagChip or MoodTagButton components themselves

## Out of scope
- Database migration of existing trips that have old tag values (leave as-is; display will gracefully fall back to a generic style for unknown tags)
- Analytics page tag distribution (it reads raw values from DB — will auto-update as new trips use new tags)

## Implementation Notes
- Files modified:
  - `src/types/trip.ts` (MoodTag union + ALL_MOOD_TAGS)
  - `src/components/MoodTagChip/MoodTagChip.constants.ts` (TAG_CLASS_MAP + TAG_ICON_MAP)
  - `src/components/MoodTagChip/MoodTagChip.tsx` (fallback class updated to tagLuxury)
  - `src/components/MoodTagChip/MoodTagChip.module.css` (removed old, added 6 new tag classes)
  - `src/components/MoodTagButton/MoodTagButton.tsx` (MOOD_ICONS + fallback updated)
  - `src/components/MoodTagButton/MoodTagButton.module.css` (same as chip module)
  - `src/components/ExploreSection/ExploreSection.tsx` (TAG_ICONS + imports updated)
  - `src/app/new-trip/NewTripClient.tsx` (MOOD_TAGS array)
  - `src/app/trips/[id]/edit/EditTripClient.tsx` (MOOD_TAGS array)
  - `src/app/api/explore/route.ts` (fallback tag changed from "Hidden Gems" to "Adventure")
  - `src/data/mockTrips.ts` (stale tags replaced)
  - `src/data/mockExplore.ts` (stale tags replaced)
- Deviations from task requirements: Also fixed ExploreSection.tsx and explore API route which referenced old tags but were not listed in the task file
- New design tokens used: none (all new tag colors are hardcoded following the established pattern of the existing tag classes)


## Completion Summary
Content change: removed Hidden Gems (renamed to Luxury) and Instagrammable; added Relaxation & Wellness, Couples & Romantic, Family, Backpacking & Budget, Cruises across 12 files including constants, CSS modules, form lists, explore section, API fallback, and mock data. Confirmed by user 2026-06-29.
