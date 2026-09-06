# Task: Backfill `region` on existing attractions

Status: done
Track: B
Track reason: data migration/logic — no UI change

Goal: [[region-level-hierarchy]] (task 2 of 4)

## Problem
The `region` field now exists on the schema (task 1) but every existing attraction has it
unset. Some countries in the DB have a dense cluster of small towns/cities that would
benefit from an intermediate grouping (the user's own example: Germany's Black Forest towns).

## Goal
Backfill `region` on existing attractions for the clusters the user approved, without
guessing on the ones that were ambiguous or geopolitically sensitive — those were confirmed
with the user first, per their explicit requirement.

## What was proposed and approved
A region-migration-proposal artifact was built from the actual country/city pairs in the DB
(not invented) and reviewed with the user before anything moved:
- **Germany → "Black Forest"** for the Schwarzwald town cluster (~130 towns). 10 towns
  flagged as likely NOT actually Black Forest (Karlsruhe, Bisingen, Cleebronn, Leichlingen,
  Lichtenstein, Maulbronn, Ortenaukreis, Singen, Tuttlingen, Wehrheim) were deliberately
  excluded — confirmed unregioned after migration.
- **Italy → "Lake Garda"** for the lake's town cluster (~20 towns).
- **Iceland →** one of the 8 standard tourism regions (Capital Region, Reykjanes, West,
  Northwest, North, South Iceland) per city/municipality.
- **Georgia → "Kazbegi / Georgian Military Highway"** for that corridor's small cluster.
- **Israel →** neutral geographic areas (Galilee, Golan Heights, Jordan Valley, Carmel,
  Sharon, Gush Dan, Shfela, Negev, Dead Sea, Arava, Jerusalem Hills) instead of
  administrative/political districts, per the user's explicit request and to avoid asserting
  a stance on contested territory framing.
- **US-NY → country changed from `"US-NY"` to `"USA"`, region set to `"US-NY"`** — the old
  add-attractions convention of overloading `country` with a US state code moves to the new
  `region` field, per the user's explicit instruction.
- Every other country (Bulgaria, Czech Republic, France, Hungary, Poland, Romania, United
  Kingdom) was left ungrouped — no natural cluster, single dominant city or several unrelated
  major cities.

## Requirements
- `scripts/migrate-attraction-regions.mjs`: idempotent migration script (exact country+city
  match, `$set` only) implementing the approved mapping above
- Verified post-run:
  - All 10 flagged German towns have no region set
  - Every country not in the approved list has zero documents with `region` set
  - `US-NY` no longer exists as a `country` value anywhere; the migrated sample has
    `country: "USA"`, `region: "US-NY"`
  - 1256 / 2301 attractions now have a region set

## Constraints
- Matching is by exact country+city string — no fuzzy matching, so a future city with a typo
  variant of a listed name won't silently get swept in
- Script is safe to re-run (idempotent `$set`, no destructive operations)

## Out of scope
- Any UI changes (editor or Explore) — those are separate tasks
- Updating `add-attractions/SKILL.md`'s guidance for future US entries — done as a closely
  related follow-up in this same task since it directly reflects the same convention change
  (`country: "USA"` + `region: "US-XX"` instead of `country: "US-XX"`), documented in
  Implementation Notes below

## Implementation Notes
- Files created/modified:
  - scripts/migrate-attraction-regions.mjs (new — the migration script, run once against the live DB, kept in the repo as a historical record matching the existing migrate-attraction-categories.mjs precedent)
  - .claude/skills/add-attractions/SKILL.md (updated the `country`/added `region` guidance rows so future manually-added US attractions follow the new convention: `country: "USA"` + `region: "US-XX"`)
- Deviations from task requirements: none
- New design tokens used: none (no UI)

## Completion Summary
Backfilled `region` on 1,256/2,301 existing attractions per the user-approved mapping (Germany/Black Forest, Italy/Lake Garda, Iceland's 8 regions, Georgia/Kazbegi corridor, Israel's neutral geographic areas, US-NY country/region split), verified with post-run checks, and updated add-attractions/SKILL.md for the new US convention going forward. Confirmed by the user 2026-09-06.
