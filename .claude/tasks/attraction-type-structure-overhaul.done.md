# Task: Attraction Type & Category Structure Overhaul

Status: done

Track: B
Track reason: pure data/constants/logic update — new types, category restructure, color mapping; no new visual surface

## Problem
The category taxonomy needs refinement: Landmark belongs in Culture (not Sightseeing), Nightclub belongs in Entertainment (not a standalone Nightlife category), and several categories are missing common subtypes that travelers actually use.

## Goal
Update the attraction type system so categories and types reflect real-world travel planning needs, and the calendar timeline uses per-category colors instead of per-type colors.

## Required changes

### Remove categories / move types
- **Remove** the "Nightlife" category (move Nightclub → Entertainment)
- **Remove** the "Sightseeing" category (move Landmark → Culture)
- **Remove** the standalone "Shopping" type — replace with Mall, Store, Market

### Add new types
| Category | New types to add |
|---|---|
| Food & Drink | Supermarket, Food Truck |
| Culture | (receives Landmark from Sightseeing) |
| Nature & Outdoor | Hiking |
| Entertainment | Water Park, Escape Room, Stand-Up Comedy, Nightclub (from Nightlife) |
| Shopping | Mall, Store, Market (replaces generic "Shopping") |
| Wellness | Gym, Pool |

### Final category structure
| Category | All types |
|---|---|
| Food & Drink | Restaurant, Bar, Café, Supermarket, Food Truck |
| Culture | Museum, Gallery, Theatre, Religious, Landmark |
| Nature & Outdoor | Park, Beach, Zoo, Hiking |
| Entertainment | Cinema, Concert, Casino, Amusement Park, Water Park, Escape Room, Stand-Up Comedy, Nightclub |
| Shopping | Mall, Store, Market |
| Wellness | Spa, Gym, Pool |
| Transportation | Flight, Train, Car Rental, Cruise / Port, Bus, Taxi / Rideshare |
| Accommodation | Hotel, Apartment, Hostel, Villa |

### Files to update

**`attraction.types.ts`**
- Add: "Supermarket", "Food Truck", "Hiking", "Water Park", "Escape Room", "Stand-Up Comedy", "Mall", "Store", "Market", "Gym", "Pool"
- Remove: "Shopping" (replaced by Mall/Store/Market — check if any downstream code references it first)

**`attraction.constants.ts`**
- Update `ATTRACTION_TYPES` array
- Update `TYPE_CATEGORIES` record to match final category structure above
- Update `CATEGORY_ORDER` (remove Nightlife and Sightseeing)
- Add new exported constant `CATEGORY_COLORS: Record<string, string>` — one color per category:
  ```ts
  export const CATEGORY_COLORS: Record<string, string> = {
    "Food & Drink":    "#F59E0B",
    "Culture":         "#7C3AED",
    "Nature & Outdoor":"#059669",
    "Entertainment":   "#E11D48",
    "Shopping":        "#0891B2",
    "Wellness":        "#10B981",
    "Transportation":  "#475569",
    "Accommodation":   "#D97706",
  };
  ```

**`AttractionTypeChip.tsx`**
- Add icons for all new types: Supermarket → `ShoppingCart`, Food Truck → `Truck`, Hiking → `Mountain`, Water Park → `Droplets`, Escape Room → `KeyRound`, Stand-Up Comedy → `Mic`, Mall → `Store`, Store → `ShoppingBag`, Market → `Tent`, Gym → `Dumbbell`, Pool → `Waves` (Waves already used by Beach — use `Droplet` for Pool instead)

**`CalendarSection.tsx`**
- Replace `typeColor()` with a `categoryColor()` function that looks up the type's category via `TYPE_CATEGORIES` and returns the corresponding `CATEGORY_COLORS` value
- Import `TYPE_CATEGORIES` and `CATEGORY_COLORS` from `@/components/NewAttractionModal/attraction.constants`
- The `TYPE_COLORS` constant and `typeColor()` function can be removed

**`TripDayMapWidget.tsx`**
- Same change: replace local `TYPE_COLORS`/`typeColor()` with `categoryColor()` using the same logic

## Constraints
- CSS Modules only — no visual changes needed, only logic/data
- Keep `ATTRACTION_TYPES` array in sync with the union type (add new, remove "Shopping")
- Ensure `ICONS` record in `AttractionTypeChip.tsx` has an entry for every type in the union

## Out of scope
- Adding category icons to the picker chips (next task)
- Updating AttractionSearchModal to use two-level picker (next task)
- Updating analytics grouping (next task)


## Implementation Notes
- Files modified: `attraction.types.ts`, `attraction.constants.ts`, `AttractionTypeChip.tsx`, `CalendarSection.tsx`, `TripDayMapWidget.tsx`
- Deviations from brief: none
- New design tokens used: none


## Completion Summary
Taxonomy restructured to 8 categories. 11 new types added, Shopping generic type removed. CATEGORY_COLORS exported. Calendar and map now color blocks by parent category via categoryColor(). Confirmed by user 2026-06-30.
