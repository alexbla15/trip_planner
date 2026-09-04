# Task: Explore page — saving an attraction edit should reopen its read-only card

Status: done
Track: B
Track reason: bug fix — behavior inconsistency between two existing edit flows (Explore vs Trip Detail), no new UI surface

## Problem
On the Explore page, saving an edit in NewAttractionModal closed both the edit modal and
the read-only AttractionDetailModal, dropping the user back to the plain grid. The Trip
Detail page's equivalent edit flow already reopens the read-only detail card with the
freshly saved data after a save — Explore was the odd one out.

## Goal
After saving an edit on Explore, the edit modal closes and the read-only detail card for
that attraction reopens automatically, showing the updated data — matching Trip Detail's
existing behavior.

## Requirements
- `handleEditSave` in ExploreClient.tsx sets `selectedAttraction` to the freshly updated
  attraction instead of `null` after a successful save (mirrors TripDetailClient's
  `handleAttractionUpdate`, which already does this via `setViewingAttraction(editedRow)`)

## Constraints
- Only Explore and Trip Detail have an edit entry point (`onEdit={...}`) — verified via
  grep, no other page needed this fix

## Out of scope
- CategoryAttractionsPanel (read-only only, no edit flow)

## Implementation Notes
- Files created/modified: src/app/explore/ExploreClient.tsx (handleEditSave now calls setSelectedAttraction(updated) instead of setSelectedAttraction(null), reopening the read-only card with fresh data)
- Deviations from task requirements: none
- New design tokens used: none

## Completion Summary
Fixed ExploreClient's handleEditSave to reopen the read-only detail card with the freshly saved attraction after an edit, matching TripDetailClient's existing behavior. Confirmed by the user 2026-09-04.
