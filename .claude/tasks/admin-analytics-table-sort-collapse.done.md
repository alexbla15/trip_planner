# Task: Alphabetical admin lists (remove manual order) + collapsible tables

Status: done
Track: A
Track reason: "collapsible table" is a brand-new UI pattern — no accordion/expand-collapse component or design-system token exists anywhere in the app yet.

## Problem
Three lists on `/admin` (Attraction Categories, Attraction Types, Travel Moods) support manual reordering via a numeric "Display order" field (Mongoose `order` field, API sort-by-order, form input, `#order` badge). This adds admin friction for no real benefit — a simple alphabetical list is easier to scan and maintain. Separately, `/admin`'s three lists and `/analytics`'s tables (Top Explorers table, and the `RankedList` component used for Trips/Attractions/Users/Countries/Cities) are always fully expanded, which gets long and hard to navigate.

## Goal
- `/admin`'s three lists (Attraction Categories, Attraction Types, Travel Moods) are sorted alphabetically by name with no manual-order mechanism left anywhere (UI, API, or DB schema).
- All list/table sections on `/admin` and `/analytics` can be collapsed and expanded by the user.

## Requirements
- **Remove manual ordering entirely** (confirmed via prior audit — exact locations):
  - Mongoose `order: Number` field + its index on `src/models/AttractionCategory.ts`, `src/models/AttractionType.ts`, `src/models/MoodTag.ts`.
  - `.sort({ order: 1 })` in `src/app/api/attraction-categories/route.ts`, `src/app/api/attraction-types/route.ts`, `src/app/api/mood-tags/route.ts` — replace with alphabetical sort by `name` (DB-level `.sort({ name: 1 })` or equivalent).
  - `order` read/write in the POST/PATCH bodies of `attraction-categories/route.ts` + `[id]/route.ts`, `attraction-types/route.ts` + `[id]/route.ts`, `mood-tags/route.ts` + `[id]/route.ts`.
  - The "Display order" numeric input and `#{order}` badge in `src/app/admin/AdminClient.tsx` (category form ~line 157-160, type form ~264-267, mood form ~396-399; badges at ~616, 723, 819-823).
  - `order` fields/defaults in `src/lib/adminForms.ts`.
  - The incrementing `order` counter logic in `src/app/api/attraction-categories/seed-from-types/route.ts` (categories it creates should just come out in whatever order the DB returns, then get alphabetized by the same sort as everything else).
- Attraction Types remain grouped by category (existing grouping behavior stays) — within each category group, types are alphabetical by name; the categories themselves (and their groups) are also alphabetical.
- Update `swagger.yaml` for the three affected route families (categories/types/mood-tags) — remove `order` from request/response schemas.
- **Do NOT touch `/analytics`'s sort order** — its "Top Explorers" table and the `RankedList` component (used for Trips/Attractions/Users/Countries/Cities) are intentionally ranked by count, not name. Confirmed with the user — leave these as-is.
- **Add collapsible sections**, applied to: `/admin`'s three lists (Attraction Categories, Attraction Types, Travel Moods), `/analytics`'s "Top Explorers" table, and `/analytics`'s `RankedList` component instances. Default state (expanded vs. collapsed on page load) and the exact interaction/visual design are the designer's call — there is no existing pattern to match, so design it fresh and add it to `docs/DESIGN_SYSTEM.md` as a reusable pattern (future lists/tables should be able to reuse it, not just these).

## Constraints
- This touches 3 Mongoose schemas (removing a field) — no migration needed; existing `order` values on stored documents become harmless orphaned data (same precedent as the recent expenses-field removal).
- `useAttractionTypes` (`src/hooks/useAttractionTypes.ts`) derives its `categories`/`byCategory` output purely from API response order — once the API sorts alphabetically, this hook's output follows automatically, no separate change needed there. Verify this holds after the API sort change.
- The new collapsible pattern must work for both a flat list (admin sections) and a `<table>` (analytics) — design it generically enough to wrap either.

## Out of scope
- Any change to `/analytics`'s ranking/sort logic (count-based order stays).
- A drag-and-drop or other replacement reordering mechanism — this is a straight removal, not a swap to a different ordering UX.
- Cleaning up orphaned `order` field data already in the database.

## Design Brief

### Existing pattern this builds on
`src/components/SectionCard/SectionCard.tsx` (+ `SectionCard.module.css`) is a shared card-with-heading component already used on `/analytics` (wraps "Top Explorers" and other panels) and `/profile`. `src/app/admin/AdminClient.tsx` currently duplicates the exact same visual pattern inline (`.card` / `.sectionHeadingRow` / `.sectionIconCircle` / `.sectionHeading` in `AdminClient.module.css` are byte-for-byte the same tokens/values as `SectionCard.module.css`'s `.card` / `.headingRow` / `.iconCircle` / `.heading`). Rather than inventing a second collapsible pattern, extend `SectionCard` itself and migrate `AdminClient.tsx`'s three list cards onto it — this both de-duplicates existing CSS and gives every consumer (present and future) the collapse behavior for free.

### `SectionCard` — new props
```ts
interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;        // new, default false — fully backward compatible
  defaultOpen?: boolean;        // new, default true — sections start expanded, never surprise-collapsed
  headingCount?: number | string; // new, optional — renders muted "(N)" after the title, e.g. Attraction Types (12)
  actions?: ReactNode;          // new, optional — right-aligned slot (e.g. "Add type" button), rendered outside the toggle so it stays clickable regardless of collapsed state
}
```

### Interaction & markup
- When `collapsible` is true, the icon + title (+ `headingCount`) become the content of a `<button type="button">` that spans the clickable heading area — `aria-expanded={open}` `aria-controls={bodyId}`. `actions` renders as a sibling after the button, outside it, so the Add button doesn't trigger the toggle and stays usable while collapsed.
- A `ChevronDown` (Lucide, 18px, matches existing icon sizing) sits at the end of the heading button, `transform: rotate(-90deg)` when collapsed → `rotate(0)` when open, `transition: transform var(--duration-base) var(--easing-out)` (200ms, existing token).
- Body wrapper gets `id={bodyId}`. Animate with the CSS grid technique (no JS height measurement, no layout thrash): outer wrapper `display: grid; grid-template-rows: 1fr; transition: grid-template-rows var(--duration-base) var(--easing-out);` → `grid-template-rows: 0fr` when collapsed, with an inner `div` at `overflow: hidden; min-height: 0`. This satisfies the repo's animation tokens and the "avoid animating height directly" best practice.
- State is local `useState(defaultOpen)` — uncontrolled, not persisted across reloads. Not in scope: remembering collapsed state in localStorage.
- Uses existing focus-visible styling already applied to buttons elsewhere in the app — no new focus token needed.

### Applying it
- **`AdminClient.tsx`** — migrate all three list cards (Attraction Categories, Attraction Types, Travel Moods) from their inline `.card`/`.sectionHeadingRow` markup to `<SectionCard icon={...} title="..." collapsible headingCount={...} actions={<button className={styles.addBtn}>...Add...</button>}>`. Delete the now-duplicated `.card`/`.sectionHeadingRow`/`.sectionIconCircle`/`.sectionHeading` rules from `AdminClient.module.css` once nothing references them (keep `.addBtn` and everything below it — those aren't duplicated). This is a structural swap, not a re-skin — visual output should be pixel-equivalent to today when expanded.
- **`AnalyticsClient.tsx`** — add `collapsible` (and `headingCount` where a natural count exists, e.g. row count) to the existing `<SectionCard icon={Trophy} title="Top Explorers">` usage. Leave the `CategoryDonutChart` SectionCard usage alone (not a list/table — out of scope, task only calls out tables).
- **`RankedList`** — do **not** wrap this in a second collapsible layer. It already has an equivalent expand/collapse interaction one level up: it only renders when a `StatCard` is clicked (`toggleStat`), and clicking the same stat again hides it (`prev === label ? null : label` in `AnalyticsClient.tsx`). Stacking a second, independent collapse toggle around an already-toggle-gated panel would give the user two overlapping ways to hide the same content and is more confusing than helpful. This is a deliberate scope adjustment from the task brief's literal wording — flag it to the user at close-out rather than silently doing it.

### Design system update
Add a new "Collapsible Section" entry to `docs/DESIGN_SYSTEM.md` under `## Component Patterns`, documenting: the chevron rotation + grid-row collapse technique, `--duration-base`/`--easing-out` reuse, default-expanded rule, and that `actions` must sit outside the toggle hit area. This makes the pattern discoverable for future tasks instead of only existing as a `SectionCard` prop nobody remembers.

## Implementation Notes
- Files created/modified:
  - `src/components/SectionCard/SectionCard.tsx` + `.module.css` — added `collapsible`, `defaultOpen`, `headingCount`, `actions` props exactly per the Design Brief (toggle button, chevron rotation, CSS-grid collapse animation, `actions` rendered outside the toggle).
  - `src/app/admin/AdminClient.tsx` — migrated all 3 list cards (Categories, Types, Moods) to `SectionCard` with `collapsible` + `headingCount` + `actions`; removed the "Display order" input from all 3 forms, the `#order`/`moodOrderBadge` badges from all 3 list rows, and the now-empty `order` param from every save payload.
  - `src/app/admin/AdminClient.module.css` — deleted the now-dead `.card`/`.sectionHeadingRow`/`.sectionIconCircle`/`.sectionHeading` (duplicated `SectionCard` styling), `.typeOrder`, `.moodOrderBadge`.
  - `src/lib/adminForms.ts`, `src/types/attractionType.ts`, `src/types/attractionCategory.ts`, `src/types/moodTag.ts` — removed `order` field.
  - `src/models/AttractionCategory.ts`, `src/models/AttractionType.ts`, `src/models/MoodTag.ts` — removed `order` schema field + its index (`AttractionType`'s compound index narrowed from `{categoryId, order}` to `{categoryId}`).
  - `src/app/api/attraction-categories/route.ts` + `[id]/route.ts`, `src/app/api/attraction-types/route.ts` + `[id]/route.ts`, `src/app/api/mood-tags/route.ts` + `[id]/route.ts` — GET sorts `{ name: 1 }` instead of `{ order: 1 }`; POST/PUT no longer read/write `order`.
  - `src/app/api/attraction-categories/seed-from-types/route.ts` — dropped the incrementing `order` counter.
  - `src/app/api/mood-tags/seed/route.ts` — dropped `order` from the 11 default mood-tag entries.
  - `src/hooks/useAttractionTypes.ts` — **this needed a real fix, not just a pass-through.** The brief's constraint said this hook "derives categories/byCategory purely from API response order... no separate change needed." That's true for `byCategory`'s row order, but false for the `categories` array itself: the old code built `categories` by first-category-encountered-while-iterating-types order, which is *not* the same as alphabetical-by-category-name even when the types themselves are name-sorted (e.g. if the alphabetically-first type happens to belong to category "Zoo", "Zoo" would appear first in `categories`). Fixed by explicitly sorting `Object.keys(map)` with `localeCompare`.
  - `swagger.yaml` — removed `order` from `AttractionType`/`AttractionTypeInput`/`AttractionCategory`/`AttractionCategoryInput`/`MoodTag`/`MoodTagInput` schemas; updated 3 endpoint descriptions from "sorted by order/display order" to "sorted alphabetically by name".
  - `src/app/analytics/AnalyticsClient.tsx` — added `collapsible` + `headingCount` to the existing "Top Explorers" `SectionCard`.
- Deviations from brief:
  - **`RankedList` was intentionally not wrapped in a collapsible `SectionCard`**, per the brief's own explicit call-out — it already has an equivalent show/hide interaction one level up (clicking its parent `StatCard` toggles it). Flagging this per the brief's instruction to surface it at close-out: the literal task wording said "and /analytics's RankedList component instances" should be collapsible, but doing so would add a second, confusing toggle on top of the existing one.
  - Fixed a real bug in `useAttractionTypes`'s category ordering (see above) that the brief's own constraint had incorrectly asserted was a non-issue — verified by reading the actual aggregation code rather than trusting the constraint at face value.
- New design tokens used: none — reused `--duration-base`, `--easing-out`, `--radius-*`, existing icon sizing (18px) already in the design system. The "Collapsible Section" pattern itself was already documented in `docs/DESIGN_SYSTEM.md` by the designer before handoff.

Verification: `tsc --noEmit` clean. `eslint` on all touched files shows only pre-existing warnings/errors on lines untouched by this change (confirmed via `git diff` — e.g. `AdminClient.tsx`'s unescaped-quote error and `useAttractionTypes.ts`'s `set-state-in-effect` error are both outside the diffed lines). Full `next build` succeeds, all 33 routes build clean. Started the dev server and confirmed `/admin` and `/analytics` both return HTTP 200 with no server-side error markers in the rendered HTML — full interactive verification (logging in as an admin, clicking the new collapse toggles, confirming visual output) was not done since I don't have a way to drive a real browser session in this environment; recommend the user does a quick manual click-through before considering this fully done.

## Completion Summary
Removed the manual "Display order" field entirely (UI, API, DB schema, swagger) from Attraction Categories, Attraction Types, and Travel Moods on `/admin`, replacing it with alphabetical-by-name sorting everywhere (including a real bug fix in `useAttractionTypes`'s category grouping). Added a reusable "Collapsible Section" pattern to the shared `SectionCard` component, documented in `docs/DESIGN_SYSTEM.md`, and applied it to all 3 admin lists plus `/analytics`'s "Top Explorers" table; deliberately left `RankedList` un-wrapped since it already has an equivalent toggle one level up. Confirmed by user 2026-07-25.
