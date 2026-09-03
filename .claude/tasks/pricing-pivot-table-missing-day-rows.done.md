# Task: Pricing pivot table hides rows that differ only by days

Status: done
Track: B
Track reason: bug fix — broken behavior in existing read-mode pivot table, no new visual surface

## Problem
In the read-only pricing pivot table shown in AttractionDetailModal, rows that have
identical tier/visitor-type fields but different applicable days are being collapsed
or omitted — only one such row appears instead of all of them. Users viewing an
attraction with day-differentiated pricing (e.g. weekday vs weekend rate for the same
tier) don't see the full picture.

## Goal
Every distinct price-tier row (including rows that differ only by their days value)
renders as its own row in the read-mode pivot table.

## Requirements
- Identify the grouping/dedup key used to build the pivot table rows and include days
  in that key so day-only-differing rows are no longer merged/dropped
- Verify against an attraction that has two tiers identical except for days (e.g. same
  tier name + visitor types, one "Mon-Fri" and one "Sat-Sun")

## Constraints
- Must not break the existing pivot layout (tier rows x visitor-type columns) built in
  recent commits (9942f8e, b3c7c24)

## Out of scope
- Any change to the editor (tab-first price tier editor already handles days per row)

## Implementation Notes
- Files created/modified: src/components/AttractionDetailModal/AttractionDetailModal.utils.ts (buildPricePivot row key now includes tier.days; added formatPriceDaysSummary helper and per-row days-suffix disambiguation when a label has more than one distinct-days row)
- Deviations from task requirements: none
- New design tokens used: none (row label is plain text, no new styling)

## Completion Summary
Fixed buildPricePivot so pricing pivot rows are keyed by label+days instead of label alone; tiers that share a label but differ only by applicable days (e.g. weekday vs weekend rate) now each render as their own row, disambiguated with a days suffix. Confirmed by the user 2026-09-03.
