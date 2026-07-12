# Task: Explore Card — Cities Relevant to Trip Only

Status: intake

Track: B
Track reason: data/logic change — filter cities shown in explore card meta to those that match the trip's attractions

## Problem
The explore card on the `/explore` page shows city metadata that includes all cities, not just those relevant to the specific trip being displayed. This makes the meta information noisy and misleading.

## Goal
Each explore card's city meta shows only the cities where that trip's attractions are located.

## Requirements
- Explore card meta cities list is derived from the trip's own attractions' `city` field
- Deduplicated and sorted (alphabetically or by attraction count)
- If a trip has no attractions with city data, show nothing or a graceful fallback
- No changes to the API shape — filter client-side from the attractions already on the card, or ensure the API returns per-trip city data

## Constraints
- Do not add a new API endpoint unless strictly necessary
- CSS Modules only

## Out of scope
- Changing the visual design of the explore card
