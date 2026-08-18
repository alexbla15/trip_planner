# Task: Personal "Visited" Tracking for Attractions

Status: done

Track: A
Track reason: New per-user data relationship (nothing like it exists on `User` today), a new interactive control (toggle) that needs a placement/visual design across several existing card/list/modal components, plus a new filter control on the Explore page — none of this is covered by existing design tokens as a ready-made pattern.

## Problem
Attractions are global, shared entities reused across many trips and many users (`src/models/Attraction.ts` — no `tripId`, no `ownerId`-based visibility restriction beyond the existing private-trip hiding). Right now there's no way for a user to record "I've actually been to this place" as a personal fact, independent of which trip(s) it's linked to or who added it. A user wants to mark places they've personally visited (in real life, from any trip they were ever part of, or discovered via Explore) and later filter Explore down to just the places they've visited — e.g. to revisit favorites or avoid re-suggesting places to themselves.

## Goal
1. A user can mark/unmark any attraction as "visited" — a purely personal flag, not shared with other users, not tied to a specific trip.
2. The visited state is visible and toggleable everywhere a user can see attraction details (at minimum: `AttractionDetailModal`, the trip Attractions tab list, and the Explore city-drill-down attraction cards).
3. The Explore page has a "visited only" filter that narrows results to attractions the current user has marked visited.

## Requirements

**Data model**
- Add `visitedAttractionIds: Types.ObjectId[]` (ref `Attraction`) to `src/models/User.ts` — no existing precedent for an array-of-refs field on `User`, so this is new (mirrors the pattern already used for `Trip.attractionIds`).
- New endpoints to toggle visited state for the authenticated user, e.g. `POST /api/users/me/visited/:attractionId` (mark visited) and `DELETE /api/users/me/visited/:attractionId` (unmark) — or a single `PUT` that accepts the desired boolean, whichever fits the codebase's existing REST conventions better (check `src/app/api/` for the established pattern before deciding). Update `swagger.yaml` accordingly (hard rule).
- Every response that includes attractions and is served to an authenticated user must attach a per-user `isVisited: boolean` — follow the same "merge a per-request/per-user override onto the shared doc" pattern already used for `schedule` in `formatAttraction()` (`src/models/Attraction.ts`). This applies to: `GET /api/attractions` (search/Explore), `GET /api/trips/:id/attractions` (trip list), and any other endpoint returning `Attraction`/`AttractionShape` objects to a logged-in user. For unauthenticated callers, `isVisited` should simply be `false`/absent — visited status requires a logged-in user.
- Add `isVisited?: boolean` to the client `Attraction` type (`src/types/attraction.ts`).

**UI — toggle control**
- `src/components/AttractionDetailModal/AttractionDetailModal.tsx`: add a "Mark as visited" / "Visited ✓" toggle button in the footer, alongside the existing conditional action buttons (`onAddToTrip`, `onEdit`) — same prop-driven pattern (`isVisited`, `onToggleVisited`).
- Trip Attractions tab (`src/app/trips/[id]/TripDetailClient.tsx`, the `paginatedAttractions` list, ~line 799 per investigation) — add a compact visited indicator/toggle on each row (design should decide: icon button vs. checkbox vs. small chip — keep it unobtrusive, this list already has edit/remove row actions).
- Explore city-drill-down attraction cards (`src/app/explore/ExploreClient.tsx` and wherever it renders attraction cards for a city) — same toggle, compact form.
- Toggling from any of these surfaces must update in real time everywhere else that attraction is currently rendered in the same session (standard optimistic-update pattern already used elsewhere in this app, e.g. `TripDetailClient.tsx`'s `upsertAttraction`).

**UI — Explore filter**
- Add a "Visited only" filter toggle to Explore's existing filter UI (`AttractionFilter`/`AttractionTypePicker` per the investigation, in `ExploreClient.tsx`) — client-side filter on the already-fetched attraction list is sufficient (matches the existing category-filter precedent, which is also client-side per the investigation), no new server query param required unless the designer/developer finds the result set is too large to filter client-side for some view.
- Only show this filter when the user is logged in (visited status doesn't exist for anonymous users).

## Constraints
- `isVisited` is inherently per-user, per-attraction — never write it onto the shared `Attraction` document itself (same rule this app already follows for `Trip.schedules` overrides — don't repeat the mistake of writing trip-specific/user-specific data onto a shared global doc).
- Toggling visited must not affect `Trip.attractionIds`/`Trip.schedules` in any way — it's a completely separate relationship (User ↔ Attraction, not Trip ↔ Attraction).
- Keep the toggle interaction fast/optimistic — don't block the UI on the API round-trip for every list this attraction appears in.

## Out of scope
- Any kind of "visited" social feature (showing OTHER users' visited attractions, visited counts/leaderboards, etc.) — this is a private, personal flag only.
- Visited date/timestamp tracking (just a boolean for now — "have you been here," not "when")
- Retroactively auto-marking attractions as visited based on trip dates having passed — this is manual/user-driven only

## Scope correction (found while grounding the design)
The original intake investigation said Explore has "city-drill-down attraction cards" — that's not accurate. Explore's city view (`ExploreClient.tsx`) shows attractions as **map pins** (`ExploreMapWidget`), not a card grid; clicking a pin opens the shared `AttractionDetailModal`. So "tick visited throughout the website... also allow Explore filtering" is satisfied by: (1) the toggle living in `AttractionDetailModal` — which is the actual shared component behind Explore pin-clicks, the trip Calendar's "view details" click, and more, so putting it there covers most of the site in one place — plus (2) a compact row-level toggle on the trip Attractions tab list (a real card/row surface, per the task's own requirement) and (3) a "Visited only" filter chip added to Explore's own inline category/type filter (`.filterSection`/`.chipGroup` in `ExploreClient.tsx` — a separate implementation from the shared `AttractionFilter` component, confirmed by grep — the Explore filter doesn't use `AttractionFilter` at all).

## Design Brief

**Data model**
- `src/models/User.ts`: add `visitedAttractionIds: Types.ObjectId[]` (ref `"Attraction"`, default `[]`) to `IUser` + schema, following the exact style already used for `Trip.attractionIds`.
- New route `src/app/api/users/me/visited/[attractionId]/route.ts`, mirroring the existing `src/app/api/users/me/route.ts` conventions (`withApiHandler`, `getUserFromRequest`, `dbConnect`):
  - `PUT` → `User.findByIdAndUpdate(userId, { $addToSet: { visitedAttractionIds: attractionId } })` → `{ isVisited: true }`
  - `DELETE` → `User.findByIdAndUpdate(userId, { $pull: { visitedAttractionIds: attractionId } })` → `{ isVisited: false }`
  - New service file `src/lib/services/visited.service.ts`: `markVisited(userId, attractionId)`, `unmarkVisited(userId, attractionId)`, and `getVisitedIdSet(userId: string | null): Promise<Set<string>>` (returns an empty Set immediately if `userId` is null — no query). Route handlers call these, matching the established route-thin/service-owns-logic pattern.
- `formatAttraction()` in `src/models/Attraction.ts` gains a 4th optional param `isVisited?: boolean`, added to the returned object as `isVisited: isVisited ?? false`.
- `src/types/attraction.ts`: add `isVisited?: boolean`.
- Call-site updates (compute the visited set/flag once per request, thread into every `formatAttraction` call):
  - `GET /api/attractions` (`route.ts`): userId is already resolved optionally here — call `getVisitedIdSet(userId)` once, pass `visitedIds.has(doc._id.toString())` per item.
  - `POST /api/attractions`: newly created, pass `false`.
  - `src/app/api/attractions/[id]/route.ts` `PUT`: single doc, use a direct membership check (`User.exists({ _id: payload.userId, visitedAttractionIds: attraction._id })`) rather than building a whole Set for one doc.
  - `listTripAttractions` in `attractions.service.ts`: already takes `userId: string | null` — call `getVisitedIdSet(userId)` once at the top, pass through to every `formatAttraction` call in both branches (unscheduled + per-instance loop).
  - `addAttractionToTrip`/`updateTripAttractionSchedule` in the same file: both always have an authenticated `payload.userId` — use the same single-doc `User.exists` check as the `[id]` route rather than a full Set for one lookup.
  - Custom-slot/flight schedule-only branches: no real `Attraction` doc — leave `isVisited` unset (defaults to `false` from `formatAttraction`'s own literal object construction in those branches, which doesn't call `formatAttraction()` at all).
- `swagger.yaml`: add `isVisited` (boolean) to the `Attraction` response schema; add the new `/api/users/me/visited/{attractionId}` path with `PUT`/`DELETE`.

**UI — toggle button visual spec**
Reuse the exact existing 44px-ish action-button patterns already in each surface rather than inventing a new control:
- `AttractionDetailModal.tsx` footer: new conditional button (`isVisited`/`onToggleVisited` props, same optional-prop-gated pattern as `onAddToTrip`/`onEdit`), base style = existing `.editTimeBtn`, plus a new `.editTimeBtnActive` modifier applied when visited:
  ```css
  .editTimeBtnActive {
    border-color: var(--color-success);
    background: rgba(5, 150, 105, 0.08);
    color: var(--color-success);
  }
  .editTimeBtnActive:hover { border-color: var(--color-success); color: var(--color-success); }
  ```
  Icon: Lucide `Check` in both states (state is conveyed by label text + color, not icon shape, per the "don't convey status by color alone" rule). Label: "Mark as visited" (default) / "Visited" (active). Placed last in the footer button row (after "Edit time & duration"), so existing button order/hierarchy for other actions is undisturbed.
- Trip Attractions tab row (`TripDetailClient.tsx`, `paginatedAttractions` list, `.rowActions`): new icon-only button matching `.editBtn`/`.removeBtn`'s exact 32×32 base, placed first (before edit/pencil, remove/trash) — `.visitedBtn` (base, identical to `.editBtn`) + `.visitedBtnActive` modifier:
  ```css
  .visitedBtnActive { color: var(--color-success); }
  .visitedBtnActive:hover { background: rgba(5, 150, 105, 0.08); }
  ```
  Icon: `Check`, `aria-label` toggles between "Mark {name} as visited" / "{name} marked as visited" (icon-only buttons need a descriptive label per the a11y rule — color alone doesn't convey state to screen readers, the label text must).
- Explore filter (`ExploreClient.tsx`): new `.filterSection` (identical structure/markup to the existing Categories/Types sections) containing one toggle chip in a `.chipGroup`, reusing `.chip`/`.chipActive` — label "Visited only", `Check` icon, `aria-pressed`. Rendered only when `user` (from `useAuth()`) is truthy. New local state `const [visitedOnly, setVisitedOnly] = useState(false)`, reset alongside `selectedCategories`/`selectedTypes` wherever those already reset on city change (mirror the existing effect). Add `const passVisited = !visitedOnly || a.isVisited;` to `filteredAttractions`'s existing filter predicate (`passCategory && passType && passVisited`).

**Optimistic update + cross-instance propagation**
New client service functions in `src/services/attractions.service.ts` (or wherever `updateAttraction`/`removeAttractionFromTrip` already live): `markAttractionVisited(attractionId, token)` (PUT) / `unmarkAttractionVisited(attractionId, token)` (DELETE). Each page (`TripDetailClient.tsx`, `ExploreClient.tsx`) gets its own `handleToggleVisited(attraction)`:
- Optimistically flips `isVisited` on every row in the page's attraction-array state whose real id matches (`(a.attractionId ?? a._id) === (attraction.attractionId ?? attraction._id)`) — same "propagate to every instance of the same shared attraction" rule already established for edits in `TripDetailClient.tsx`'s `handleAttractionUpdate` (this session's earlier duplicate-attractions work), since `isVisited` is a shared-document-level fact, not per-schedule-instance.
- Also updates `viewingAttraction`/`selectedAttraction` (whichever local state holds the currently-open modal's attraction) if it matches, so the open modal reflects the change immediately without needing to close/reopen it.
- Calls the PUT/DELETE service function; on failure, reverts the optimistic flip and shows a toast error (matches this app's established error-handling convention elsewhere in these files).
- Use `attraction.attractionId ?? attraction._id` as the id sent to the API — never a synthetic instance key (custom-slot/flight rows have no `attractionId` and should never expose the toggle at all — gate rendering on `!!attraction.attractionId`, mirroring the existing `a.attractionId` guard already used for the "Schedule again" control in `CalendarSection.tsx`).

**Auth gating**
`onToggleVisited`/the toggle button itself should only be passed/rendered when `token`/`user` exists at the call site — anonymous Explore visitors see the modal without the toggle, consistent with "isVisited requires a logged-in user."

## Implementation Notes
- Files created:
  - `src/lib/services/visited.service.ts` — `markVisited`, `unmarkVisited`, `getVisitedIdSet`, `isAttractionVisited`.
  - `src/app/api/users/me/visited/[attractionId]/route.ts` — `PUT`/`DELETE`.
- Files modified:
  - `src/models/User.ts` — `visitedAttractionIds: Types.ObjectId[]` (ref `Attraction`).
  - `src/models/Attraction.ts` — `formatAttraction()` gained a 4th `isVisited?: boolean` param, output as `isVisited: isVisited ?? false`.
  - `src/types/attraction.ts` — `isVisited?: boolean` on the client `Attraction` shape.
  - `src/app/api/attractions/route.ts` (`GET`) — resolves `getVisitedIdSet(userId)` once, threads into every `formatAttraction` call.
  - `src/app/api/attractions/[id]/route.ts` (`PUT`) — single-doc `isAttractionVisited` check.
  - `src/lib/services/attractions.service.ts` — `listTripAttractions` (Set-based, both branches), `addAttractionToTrip` (all 3 return points), `updateTripAttractionSchedule` (single-doc check) all thread `isVisited` through.
  - `src/services/attractions.service.ts` + `src/services/index.ts` — new client functions `markAttractionVisited`/`unmarkAttractionVisited`.
  - `src/components/AttractionDetailModal/AttractionDetailModal.tsx` + `.module.css` — new `isVisited`/`onToggleVisited` props, footer toggle button, `.editTimeBtnActive` modifier.
  - `src/app/trips/[id]/TripDetailClient.tsx` + `.module.css` — `handleToggleVisited` (propagates across all instances of the same attraction + the open detail modal, with rollback on failure), row-level toggle button in the Attractions tab list (visible to any logged-in viewer, not gated on `canEdit` — trip-edit rights and personal visited-marking are unrelated permissions), wired into the page's own `AttractionDetailModal` instance.
  - `src/app/explore/ExploreClient.tsx` — `handleToggleVisited` (same pattern), a new "My visits → Visited only" filter chip (logged-in users only) added to Explore's own inline filter UI (confirmed via grep this is a separate implementation from the shared `AttractionFilter` component, not reused by Explore), `visitedOnly` folded into `filteredAttractions`/`hasActiveFilters`/`activeFilterCount`/all the existing filter-reset call sites, wired into the page's `AttractionDetailModal` instance.
  - `swagger.yaml` — `isVisited` added to the `Attraction` schema; new `/api/users/me/visited/{attractionId}` path (`PUT`/`DELETE`).
  - `docs/LEARNINGS.md` — noted the "merge per-user data onto a shared-doc response at read time" pattern for future per-user attraction features.
- Corrected scope during design: the intake investigation's claim that Explore has "city-drill-down attraction cards" was inaccurate — Explore's city view is map-pin based (`ExploreMapWidget`), with `AttractionDetailModal` opened on pin click. Since that modal already got the toggle, this is covered without inventing a card grid that doesn't exist; documented in the task file's "Scope correction" section.
- Deviations from the brief: none beyond the scope correction above (which was reconciling the brief with reality, not changing what was asked for).
- New design tokens: none — reused `.editTimeBtn`/`.editBtn` bases, `--color-success`, and the existing `.chip`/`.filterSection` pattern already in `ExploreClient.module.css`.
- `tsc --noEmit`: clean throughout. `eslint` on every touched file: only pre-existing `react-hooks/set-state-in-effect` errors and one pre-existing unused-import warning (`Navigation` in `AttractionDetailModal.tsx`), all present before this task, nothing new.
- Live verification against the real dev server + real MongoDB (throwaway attraction/trip, cleaned up after): mark visited → reflected in `GET /api/attractions` (search/Explore), `PUT /api/attractions/:id` (edit), and an anonymous request correctly still shows `false`; unmark → persists correctly, raw `User.visitedAttractionIds` confirmed empty afterward. Separately verified the trip-attractions path: marking visited propagates to every scheduled instance of the same attraction (primary + a "Schedule again" duplicate), and the schedule-PATCH response also reflects it. Required a dev-server restart mid-task (per the documented Mongoose-schema-caching gotcha) after adding the new `User` field — without it, `visitedAttractionIds` writes would have silently no-opped.

## Redesign (user feedback after first review)
User asked for the toggle to be much more compact — an icon-only toggle in the modal's header, not a labeled button in the footer. Moved it: `AttractionDetailModal.tsx`'s header gained a `.headerActions` wrapper (sibling to `.headerTitle`, so `.header`'s existing `justify-content: space-between` still holds) containing the new `.visitedToggleBtn` (36px circular icon button, same footprint as `.closeBtn`) immediately left of the close button, and the old footer `.editTimeBtn`-based button (with "Mark as visited"/"Visited" label text) was removed entirely. State is conveyed via `aria-pressed`, a `title` tooltip, and a full-sentence `aria-label` (since there's no longer visible label text to carry it) plus a fill-color change (outline/neutral → solid `--color-success` background with white icon) — not by icon shape, which stays a plain `Check` in both states. Removed the now-unused `.editTimeBtnActive` CSS. `tsc`/`eslint`: clean (same pre-existing unrelated issues as before, nothing new).

## Bug fix (user testing): visited status not surviving a refresh
User reported ticking the new header toggle, refreshing, and the mark not being saved. Root cause: `getAttractionsByCity()` in `src/services/attractions.service.ts` — the function Explore's main data-loading effect (`ExploreClient.tsx`) calls on every city load/reload — never sent an `Authorization` header at all (no `token` param existed on the function). On refresh, the server-side `GET /api/attractions` route resolves `userId = null` for that request (same optional-auth pattern used everywhere else), so `getVisitedIdSet(null)` correctly returns an empty set per its own contract — the attraction really was still marked visited in the database the whole time, but the anonymous-looking refetch always reported `isVisited: false`, silently overwriting the correct in-memory state on every reload. The toggle click itself, the PUT/DELETE endpoints, and the DB write were never broken.

Fix: added an optional `token` param to `getAttractionsByCity`, sends `Authorization: Bearer <token>` when present (mirrors `searchAttractionsByCountry`/`searchAttractionsByType`'s existing pattern in the same file), and updated `ExploreClient.tsx`'s effect to pass `token` (added to the effect's dependency array too, so switching auth state re-fetches with the correct header). Verified live by reproducing the exact bug first (same request without the header → `isVisited: false` despite the DB having it marked) and then confirming the fixed call shape (with header) → `isVisited: true`.

## Follow-up enhancement: pin border color + 3-way Explore filter
User asked for two additions: (1) Explore map pins should visually distinguish visited attractions via border color, (2) the binary "Visited only" filter should become a 3-way All/Visited/Unvisited choice.
- `src/lib/mapIcons.tsx`: `makeAttractionMarkerIcon()` gained a 4th param `isVisited = false`. Border priority: measure-tool selection (`#D97706`, pre-existing, temporary/in-the-moment state) still outranks visited status; visited attractions get a `3px solid #059669` (`--color-success`, same green used everywhere else visited status is shown in this task) border instead of the default `2px solid #fff`. `src/app/explore/ExploreMapWidget.tsx`'s marker render passes `a.isVisited` through, and the tooltip appends "· Visited" (text, not just color, per the a11y "don't convey status by color alone" rule).
- `src/app/explore/ExploreClient.tsx`: replaced the boolean `visitedOnly` state with `visitedFilter: "all" | "visited" | "unvisited"` throughout (`filteredAttractions`'s predicate, `hasActiveFilters`/`activeFilterCount`, all 4 existing filter-reset call sites, the "Clear filters" button). The single toggle chip became a 3-chip `role="radiogroup"` (All / Visited with `Check` icon / Unvisited with `X` icon), same `.chip`/`.chipActive` styling as the existing category/type filter chips — no new CSS.
- `tsc --noEmit`: clean. `eslint` on all 3 touched files: only the same pre-existing `react-hooks/set-state-in-effect` errors/warning as before, nothing new.
- Verified the border-color and 3-way-filter predicate logic directly (all combinations of `selected`/`isVisited` for the border; all combinations of `visitedFilter`/`isVisited`, including `isVisited: undefined` correctly counting as unvisited, for the filter).

## Follow-up fix: category/type chips didn't respect the visited filter
User reported that selecting "Unvisited" still showed every category/type chip, including ones that only had visited matches (so selecting one alongside "Unvisited" would silently return zero results). Root cause: `availableCategories`/`availableTypes` derived their chip lists from the full unfiltered `cityAttractions`, never taking `visitedFilter` into account — only `filteredAttractions` (the actual result list) did.

Fix: extracted the visited predicate into `passesVisitedFilter(a)` (shared by `filteredAttractions` and the new logic below), added `visitedScopedAttractions = cityAttractions.filter(passesVisitedFilter)`, and switched both `availableCategories` and `availableTypes` to derive their `typeNamesInCity` set from `visitedScopedAttractions` instead of the raw `cityAttractions`. Category/type chip visibility now matches whichever visited filter is active, same as the results themselves. Verified directly: a type present only on visited attractions correctly disappears from the chip list when "Unvisited" is selected, while a type present on both visited and unvisited attractions correctly stays visible under any filter.

## Follow-up: visited filter now applies to countries/cities, moved to the page header
User asked for two more things: (1) the All/Visited/Unvisited picker should also filter which countries/cities appear (not just which attractions show once inside a city), and (2) it should live in the page header so it's obviously global, not tucked inside a scrollable per-city filter section.

**Backend** — `GET /api/attractions/cities` (`src/app/api/attractions/cities/route.ts`) was a plain unauthenticated aggregation before; now resolves an optional `userId` (same try/catch pattern as `GET /api/attractions`), calls `getVisitedIdSet`, and adds a `$addFields: { isVisited: { $in: ["$_id", visitedObjectIds] } }` stage before the `$group`, so each city's `visitedCount`/`unvisitedCount` come back in the same aggregation query — no extra round-trip. Anonymous/unauthenticated requests get `visitedCount: 0` for every city (matches the established "no auth → no visited data" contract). `swagger.yaml` updated with the two new response fields and a note on the auth behavior.

**Client**:
- `CityEntry` type gained `visitedCount`/`unvisitedCount`. `getCities()` (`src/services/attractions.service.ts`) gained an optional `token` param, sent as `Authorization` when present (mirrors `getAttractionsByCity`'s fix from earlier in this task). `ExploreClient.tsx`'s cities-loading effect now passes `token` and re-fetches on auth change.
- New `visibleCities` memo: `cities` filtered by `visitedFilter` (`visitedCount > 0` / `unvisitedCount > 0` / no filter) — `countries` and `citiesInCountry` now derive from `visibleCities` instead of the raw `cities` list, so a country/city with zero matching attractions drops out of the world/country lists entirely, at every drill-down level. (`ExploreMapWidget`'s own `cities` prop was deliberately left pointing at the raw unfiltered list — it's only used there to resolve the *currently selected* city's own coordinates for map centering, which must keep working even if that city just got filtered out of the list.)
- World-view empty state now distinguishes "no attractions exist at all" from "none match the current visited filter" (`cities.length === 0` vs `countries.length === 0`), with a filter-specific message in the second case instead of the misleading "Be the first to add one!".
- Moved the picker out of the city-only filter section into `.sidebarHeader` itself (restructured into `.sidebarHeaderTop` — the existing title/close row — plus the picker below it, both inside the header's `flex-shrink: 0` block, so it's always visible above the scrollable world/country/city content, not just when a city is selected).
- `tsc --noEmit`: clean. `eslint`: only the same pre-existing unrelated issues as before, nothing new.
- Verified live against the real API: creating two attractions in the same throwaway city (one marked visited, one not) → authenticated `GET /api/attractions/cities` returns `count: 2, visitedCount: 1, unvisitedCount: 1` for that city; the identical unauthenticated request returns `visitedCount: 0, unvisitedCount: 2`, confirming anonymous requests never see visited data.

## Follow-up fix: picker reset itself on navigation
User reported picking a filter value, then clicking a country/city, and the choice changing back. Root cause: `handleCountrySelect`/`handleCitySelect`/`handleBackToCountry`/`handleBackToWorld` all still called `setVisitedFilter("all")` — leftover from when the visited filter was city-scoped (reset on navigation, same as `selectedCategories`/`selectedTypes`, which genuinely are per-city concepts). Once the previous follow-up made `visitedFilter` a page-level filter that also drives which countries/cities are listed, those 4 resets became a bug: every click into a country or city silently wiped the user's choice back to "all". Removed all 4 — `visitedFilter` is now untouched by navigation and only changes via the header picker itself or the explicit "Clear filters" button (which still resets it, since that's a deliberate clear-everything action, not implicit navigation). `tsc`/`eslint`: clean, same pre-existing unrelated issues as before.

## Follow-up fix: stale city counts after toggling visited
User reported that under "Unvisited," cities with no unvisited attractions still appeared. Root cause: the `cities` array (holding the per-city `visitedCount`/`unvisitedCount` that `visibleCities` filters on) is fetched once and never touched again — `handleToggleVisited` only ever updated `cityAttractions`/`selectedAttraction`. So marking the last unvisited attraction in a city as visited updated the visible attraction list correctly, but the separate city-level aggregate stayed stale at its original fetch-time count, so that city kept passing the `unvisitedCount > 0` check and stayed listed under "Unvisited" — a classic two-sources-of-truth bug, same shape as the earlier `getAttractionsByCity` auth-header bug in spirit (a display value silently going stale) but a different root cause here (missing an update, not a missing header).

Fix: added `adjustCityVisitedCount(cityName, country, delta)`, called from `handleToggleVisited` right alongside the existing optimistic `cityAttractions` update (`delta: +1` when marking visited, `-1` when unmarking, with the same `-delta` reversal on rollback if the API call fails) — increments/decrements the matching city's `visitedCount` and `unvisitedCount` in the `cities` state array in lockstep, so `visibleCities`/`countries`/`citiesInCountry` recompute correctly on the very next render, no re-fetch needed. Verified the increment/decrement/rollback arithmetic directly: marking a city's last unvisited attraction visited correctly drops its `unvisitedCount` to 0.

## Follow-up fix: pill counter showed the wrong number under a filter
User reported "the counter is wrong." The country/city pill badges (`<span className={styles.cityPillCount}>`) always displayed the total attraction count (`c.count`) regardless of the active `visitedFilter` — so selecting "Unvisited" would still show e.g. "12" next to a city where only 4 attractions were actually unvisited, mismatching what you'd see after drilling in.

Fix: added a `countFor(entry)` helper that picks `count`/`visitedCount`/`unvisitedCount` based on the current `visitedFilter`, and used it in two places: the `countries` aggregation now sums each city's *filtered* count (`countFor(city)`) rather than always `city.count`, and the city-pill rendering in country view now calls `countFor(c)` instead of reading `c.count` directly. Country pills in world view already picked up the fix automatically since they read `CountryEntry.count`, which the aggregation now computes correctly. Verified the aggregation arithmetic directly across all three filter states.

## Completion Summary
Users can now mark/unmark any attraction as personally visited — a private, per-user flag independent of trips — via a compact header toggle in the attraction detail modal (used across Explore, trip Calendar, and elsewhere) and a row-level toggle in the trip Attractions tab. Explore gained a page-level All/Visited/Unvisited picker in its sidebar header that filters attractions, map pin border color, and which countries/cities are even listed (with live-updating counts), plus a distinct green pin border for visited attractions on the map. Shipped after several rounds of real user testing that caught and fixed: a missing auth header causing visited status to appear lost on refresh, category/type filter chips not respecting the visited filter, the picker resetting itself on navigation, stale city-level counts after toggling, and pill counters showing unfiltered totals. Confirmed closed by the user 2026-08-17.
