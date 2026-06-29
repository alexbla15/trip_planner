# Task: Parent Category Grouping for Attraction Types

Status: intake

Track: A
Track reason: new UI interaction pattern — two-level type picker (category → type) with expanded type set; no existing pattern

## Problem
The attraction type picker currently shows 12 types as a flat chip grid. As the type list grows (especially with transportation and accommodation types being added), a flat grid becomes hard to scan. Users need a way to narrow choices by selecting a parent category first.

## Goal
The attraction type picker is reorganized into parent categories so users can quickly find the right type without scrolling through all options.

## Requirements

### Category structure
Group existing and new types under parent categories:

| Category | Types |
|---|---|
| Food & Drink | Restaurant, Bar, Café |
| Culture | Museum, Gallery, Theatre |
| Nature & Outdoor | Park, Beach |
| Sightseeing | Landmark |
| Shopping | Shopping |
| Nightlife | Nightclub |
| Wellness | Spa |
| Transportation | Flight, Car Rental, Train, Bus, Taxi / Rideshare |
| Accommodation | Hotel, Apartment, Hostel, Villa |

New types (in Transportation and Accommodation) should be added to the `AttractionType` union and `ATTRACTION_TYPES` constant.

### Picker UI (in NewAttractionModal)
- Step 1: Show category chips (one per category) — user taps to select a category
- Step 2: Show the types within that category — user taps to select one or more types
- A "← Back" link or "All categories" reset lets the user switch categories
- Selected types from multiple categories can co-exist (multi-select across categories)
- The category header of any selected type is highlighted to indicate active selection

### Non-functional
- Accessible: category chips and type chips both use `role="checkbox"` / `aria-pressed`
- Responsive: category chips wrap (same as current chip grid)
- No data model change to the `Attraction` type — types remain `string[]`

## Constraints
- CSS Modules only
- No new npm packages
- The `attraction.types.ts` `AttractionType` union and `ATTRACTION_TYPES` constant in `attraction.constants.ts` must be updated
- `ICONS` in `AttractionTypeChip.tsx` must be extended with icons for all new types

## Out of scope
- Limiting to one category per attraction (multi-category allowed)
- Changing how types are stored in the database
