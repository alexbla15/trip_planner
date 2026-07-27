---
name: add-attractions
description: Bulk-add Attraction documents directly to MongoDB via a one-off script, bypassing the authenticated /api/attractions route. Use when the user asks to add/seed/import a batch of attractions (malls, restaurants, markets, parks, etc.) to the database, especially many at once.
---

# Adding attractions to the DB in bulk

This project stores attractions as Mongoose documents (`src/models/Attraction.ts`, collection
`attractions`) in MongoDB. There is no seed file for attractions. For one-off batches (the user
pastes a list of place names), write and run a throwaway `.mjs` script in `scripts/` rather than
hitting the authenticated `POST /api/attractions` route N times — it avoids needing an auth token
and matches the existing precedent (`scripts/migrate-attraction-categories.mjs`).

## Required fields (schema: `src/models/Attraction.ts`)

| Field | Notes |
|---|---|
| `ownerId` | **Required.** ObjectId ref to `User`. Resolve by looking up the user's email in the `users` collection — do not invent an id. |
| `name` | **Required, globally unique** (case-insensitive collation `{locale:"en", strength:2}`). Duplicate insert will fail — check for an existing doc by name first and skip it. |
| `country` | **Required.** |
| `city` | **Required** unless `subtype === "flight"`. |
| `types` | Array of ObjectId refs to `AttractionType`, looked up **by name** (e.g. `"Restaurant"`, `"Mall"`, `"Market"`, `"Park"`, `"Zoo"`). Query the `attractiontypes` collection for the exact names you plan to use; if one is missing, stop and report it rather than guessing an id. |
| `durationValue` / `durationUnit` | **Always set both**, even though the schema marks them optional. `src/lib/schedule.ts` (`attractionEndMins`) falls back to `"0"` minutes when missing, which breaks calendar block sizing and conflict detection. Use a realistic estimate per venue type (e.g. malls/parks `"2"`/`"hours"`, quick restaurant meal `"1"`/`"hours"`, sit-down restaurant `"1.5"`/`"hours"`). |
| `coordinates` | `{ lat, lng } \| null`. If asked to add coordinates, use best-effort approximations from general geographic knowledge (no geocoding API is wired into this repo) and say so explicitly — don't silently present guesses as verified data. |
| `price` / `currency` | `price: number \| null`, `currency` defaults `"USD"` but any code from `src/lib/currencies.ts` is valid (e.g. `"GEL"` for Georgia). Use `null` for free venues (malls, markets, parks with free entry), no cost for restaurants. |
| `openingHours` | `Record<"Mon"\|...\|"Sun", {closed: boolean, open: "HH:MM", close: "HH:MM"}>` (24h strings — see `NewAttractionModal.tsx`). Fill all 7 days with typical hours for the venue type if asked; note these are representative, not each venue's actual posted schedule. |

## Workflow

1. **Explore first** (or reuse knowledge if already established this session): confirm the Mongoose/DB choice, `Attraction`/`AttractionType`/`User` schemas, and read `.env.local` for `MONGODB_URI` (don't print the secret).
2. Resolve the owner (`users` collection, by email) and the needed `AttractionType` ids (`attractiontypes` collection, by name) up front; fail loudly and list available type names if any are missing instead of inserting with a bad/missing type.
3. Write a script in `scripts/` (pattern: read `MONGODB_URI` out of `.env.local` with a regex, `mongoose.connect()`, raw `db.collection(...)` operations, `mongoose.disconnect()` at the end — see `scripts/migrate-attraction-categories.mjs`).
4. For each record: check for an existing doc with the same `name` under the unique collation before inserting, so re-runs are idempotent (`[skip]` vs `[created]` logging).
5. Run with `node scripts/<name>.mjs` and report a created/skipped count.
6. If the user asks for a follow-up field (coordinates, price, opening hours) after the initial insert, write a **second small backfill script** that `updateOne`s by `name` (with the same collation) rather than re-running the insert script — the insert script's skip-if-exists logic won't touch already-created docs.
7. Delete or leave the scratch scripts in `scripts/` per user preference — they're throwaway, not meant to be re-run as part of any build/CI step. Don't add them to `package.json` scripts unless asked.

## Gotchas hit in practice

- A record's `name` in the DB can drift from what you originally inserted (e.g. edited later via the UI). If a backfill script reports `[not found]` for a name you're sure you created, search the `attractions` collection with a partial regex match on the distinctive part of the name before assuming the insert failed.
- Don't fabricate precision you don't have — flag approximate coordinates/prices/hours as such in your final summary to the user instead of presenting them as verified facts.
