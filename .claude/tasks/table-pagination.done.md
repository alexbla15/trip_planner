# Task: Pagination for Tables (Max 5 Rows)

Status: done

Track: A
Track reason: No pagination UI component exists for `<table>` elements today (a *list* pagination pattern exists for the trip-detail attractions list — see Implementation Notes in `.claude/tasks/attractions-pagination.done.md` — but not a table-row pattern, and page size/behavior here differs).

## Problem
There is exactly one real data `<table>` in the app: the "Top Explorers" leaderboard in `src/app/analytics/AnalyticsClient.tsx` (line ~247), which renders `data.topUsers` in full with no pagination. As the user base grows this table will scroll indefinitely with no way to page through it.

## Goal
Any table in the app showing a list of rows is paginated at a maximum of 5 rows per page, with clear controls to move between pages.

## Requirements
- Build a small reusable table-pagination pattern (component and/or hook) that any `<table>` in the app can adopt
- Apply it to the "Top Explorers" table in `AnalyticsClient.tsx`: max 5 rows visible per page
- Show page controls (Previous/Next + "Page X of Y", consistent with the style already established in `.claude/tasks/attractions-pagination.done.md`'s implementation) only when total rows > 5
- Accessible: `aria-label`s on Previous/Next, `aria-live="polite"` (or similar) on the page indicator
- Responsive: controls fit cleanly on mobile
- If any other `<table>` is added to the app later, this pattern should be straightforward to reuse — but do not go retrofit non-table list UIs (e.g. `AdminClient.tsx`'s div-based category/type/mood lists) as part of this task; those aren't `<table>` elements and are out of scope per the "tables" framing

## Constraints
- CSS Modules only
- No external pagination library — `useState`-driven client-side slicing, consistent with the existing attractions-list pagination precedent
- Data is already fetched client-side for the analytics table — no server-side pagination needed

## Out of scope
- Server-side/API pagination (skip/limit) — not needed since table data is already fully fetched
- Sorting/filtering within the table (separate concern)
- Converting the `AdminClient.tsx` div-based lists into tables

## Design Brief

### Precedent to reuse, not reinvent
A near-identical pagination pattern already exists and shipped for the trip-detail attractions list (`.claude/tasks/attractions-pagination.done.md`, implemented inline in `src/app/trips/[id]/TripDetailClient.tsx` ~lines 818-848 / `.module.css` ~lines 736-786): Previous/Next buttons flanking a "Page X of Y" indicator, only rendered when `totalPages > 1`, `aria-live="polite"` on the indicator, `aria-label`s on both buttons, disabled+dimmed state at the first/last page. **Extract this exact visual design into a shared component** rather than designing something new — this task's own requirement is "any table in the app can adopt" it, and a second inline copy would be the same inconsistency this task is trying to avoid.

### Component structure
- `src/components/Pagination/` — `Pagination.tsx`, `Pagination.module.css`, `Pagination.types.ts`, `Pagination.utils.ts`, `index.ts`, following the standard component-folder convention.
- `Pagination.tsx` props: `{ page: number; totalPages: number; onPageChange: (page: number) => void }`. Renders `null` when `totalPages <= 1` (component owns this guard, so callers don't need to check).
- `Pagination.utils.ts` exports a small `usePagination<T>(items: T[], pageSize: number)` hook returning `{ page, setPage, totalPages, paginatedItems, goToPage }` — centralizes the slicing math (`Math.ceil(items.length / pageSize)`, `.slice(...)`) so a table only needs one hook call instead of hand-rolling `totalPages`/`paginatedX` each time, mirroring the exact math already proven in `TripDetailClient.tsx`.

### Visual design (copy exactly — this is a consistency task, not a restyle)
- Container: `display: flex; align-items: center; justify-content: center; gap: 16px; padding-top: 12px; border-top: 1px solid var(--color-border-subtle); margin-top: 4px;`
- Prev/Next buttons: 36px height, `padding: 0 14px`, `border-radius: var(--radius-md)`, `border: 1.5px solid var(--color-border)`, `background: var(--color-surface)`, `color: var(--color-text-secondary)`, 13px/weight 500 text, icon+label (`ChevronLeft`/`ChevronRight`, 14px, from `lucide-react`). Hover: border + text → `var(--color-primary)`. Disabled (first/last page): `opacity: 0.4; cursor: not-allowed; pointer-events: none`.
- Page indicator: 13px/weight 500, `var(--color-text-secondary)`, `min-width: 80px`, centered, text "Page {page} of {totalPages}", `aria-live="polite"` + `aria-atomic="true"`.
- No new colors, radii, or spacing values — every token above is already in `docs/DESIGN_SYSTEM.md` / already used by the precedent component.

### Applying it to the Top Explorers table
- `AnalyticsClient.tsx` (~line 225-277): replace the direct `data!.topUsers.map(...)` with `usePagination(data!.topUsers, 5)`'s `paginatedItems`, render `<Pagination>` after the `</table>` (inside `styles.tableWrapper`, matching where `TripDetailClient` places its controls — after the list, before the card ends).
- **Critical correctness detail:** the row `key`, rank number (`i + 1` shown in the `#` column), and the gold-highlight logic (`i === 0 ? goldRank/rowGold styling`) are all currently derived from the array index within the *rendered* slice. Once paginated, page 2's first row must show rank **6** (not 1), and the gold/trophy styling must only apply to the true #1 explorer overall, not to whichever row happens to render first on the current page. Compute the true rank as `(page - 1) * PAGE_SIZE + localIndex + 1` and only apply gold styling when that computed rank `=== 1`.
- `headingCount` on the `SectionCard` (currently `data!.topUsers.length`) stays as the full/total count — it's a count label, not a page-relative one, so it doesn't change.

### Accessibility & responsive
- Buttons keep existing 44px-adjacent touch sizing precedent is 36px height in this specific component (already shipped, not flagged as a problem) — no change needed there since it matches the already-approved precedent.
- Mobile: the flex container wraps naturally at narrow widths (gap holds); no special breakpoint CSS needed beyond what the precedent already has, since it was already verified responsive in its original task.
- Respect `prefers-reduced-motion` implicitly — this control has no animation to begin with.

No new icons needed — `ChevronLeft`/`ChevronRight` are already used for this exact purpose in `TripDetailClient.tsx` and already imported from `lucide-react` in `AnalyticsClient.tsx` isn't confirmed, so the developer should check and add the import if missing.

## Implementation Notes
- Files created: `src/components/Pagination/{Pagination.tsx,Pagination.module.css,Pagination.types.ts,Pagination.utils.ts,index.ts}` (extracted from `TripDetailClient`'s existing pagination markup/CSS, byte-for-byte visual match — same tokens, same Previous/Next + "Page X of Y" structure)
- Files modified: `src/components/index.ts` (barrel export), `src/config/ui.ts` (added `TABLE_PAGE_SIZE = 5`), `src/app/analytics/AnalyticsClient.tsx` (Top Explorers table now uses `usePagination(topUsers, TABLE_PAGE_SIZE)` + renders `<Pagination>` after the table)
- Deviations from brief: none
- New design tokens used: none — reused every token from the existing `TripDetailClient` pagination precedent
- **Correctness detail applied as specified:** rank number and gold/trophy styling are computed from `(page - 1) * TABLE_PAGE_SIZE + localIndex + 1`, not the rendered slice's local index — so page 2's first row correctly shows rank 6, and only the true #1 explorer overall gets the gold row styling, not whichever row renders first on the current page.
- `headingCount` on the SectionCard still reflects the full/total explorer count, not the paginated count, per the brief.
- `tsc --noEmit` and `eslint` (scoped to touched files) both clean — the only eslint findings are two pre-existing warnings (`Link` unused import, `rawTypes` exhaustive-deps) unrelated to this change.
- **Bug caught by the user in review, fixed after initial "reviewing" status:** `Pagination.utils.ts` used `useState`/`useMemo` without a `"use client"` directive. `tsc --noEmit` didn't catch it (per the established pattern in `docs/LEARNINGS.md` re: barrel files), but `next build` did once triggered — a Server Component page reachable through the `@/components` barrel failed with "You're importing a module that depends on `useState` into a React Server Component module." Fixed by adding `"use client"` to the top of `Pagination.utils.ts`. Re-ran `next build` (all 35 routes) clean after the fix.
- **Scope extended by user during review:** requested pagination also apply to the Analytics/Profile "detail panel" (`RankedList`, shown when a stat card is clicked). `RankedList.tsx` now paginates internally via `usePagination`/`Pagination` (added `"use client"`, same 5-per-page size via `TABLE_PAGE_SIZE`), with rank numbers computed page-relatively (same correctness pattern as the Top Explorers table). Removed the ad-hoc `.slice(0, 10)` hard truncation in `AnalyticsClient.tsx`'s "Total Attractions" and "Cities Covered" detail rows, since real pagination replaces the need for a hard cap — users can now page through the full list instead of only ever seeing the first 10. `ProfileClient.tsx`'s equivalent `detailRows` had no such cap already, so it needed no change beyond the shared `RankedList` component gaining pagination.
- **Operational note, not a code bug:** running a production `next build` into the same `.next` directory while `next dev` is concurrently running against it corrupted the dev server's route manifest twice during this task (each time immediately after a build), causing a transient `GET /trips 404` in the browser even though the code and build were both correct. Fixed each time by restarting the dev server process. Not something to "fix" in code — just don't run `next build` in parallel with a live `next dev` session pointed at the same project, or expect to restart dev afterward.

## Completion Summary
Extracted a reusable `Pagination` component + `usePagination` hook (mirroring the exact visual design of the existing trip-detail attractions pagination) and applied it to the Top Explorers table on `/analytics`, and — per a scope extension requested during review — to the Analytics/Profile stat-detail panel (`RankedList`), both capped at 5 rows per page with page-relative rank numbers. Along the way, fixed a real barrel/SSR bug (`Pagination.utils.ts` missing `"use client"`) caught only by a full `next build`, and worked around an operational issue where running that build alongside a live `next dev` session twice corrupted the dev server's route manifest (fixed by restarting it, not a code change). Confirmed by user. Closed 2026-07-29.
