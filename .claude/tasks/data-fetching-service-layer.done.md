# Task: Data Fetching Service Layer

Status: done
Track: B
Track reason: Refactor/cleanup — internal structure only, no user-facing visual change.
Goal: .claude/tasks/goals/architecture-standards-remediation.md

## Problem
There is no `/services` directory anywhere in the project. Raw `fetch()` calls are made directly inside ~25 components, hooks, and contexts, including:
- `src/app/trips/[id]/TripDetailClient.tsx` — 11 inline fetches (trip/attraction CRUD, mark visited, etc.)
- `src/app/admin/AdminClient.tsx` — 8 inline fetches (type/category/mood-tag admin CRUD)
- `src/app/trips/[id]/CalendarSection.tsx` — 6 inline fetches (fx rate, attraction update/delete, residence patch)
- `src/hooks/useMoodTags.ts`, `src/hooks/useAttractionTypes.ts`, `src/hooks/useAttractionCategories.ts` — module-scope fetch helpers baked into hooks
- `src/contexts/AuthContext.tsx` — module-scope `fetchProfile()`
- `src/app/login/LoginClient.tsx`, `src/app/register/RegisterClient.tsx`, `src/app/profile/ProfileClient.tsx`, `src/app/explore/ExploreClient.tsx`, `src/app/trips/TripsClient.tsx`, `src/app/new-trip/NewTripClient.tsx`, `src/components/TripSharingPanel/TripSharingPanel.tsx`, `src/components/ExpensesPanel/ExpensesPanel.tsx`, `src/components/NewAttractionModal/NewAttractionModal.tsx`, `src/components/AddResidenceModal/AddResidenceModal.tsx`, `src/components/CitiesMap/CitiesMap.tsx`, `src/components/CountriesMap/CountriesMap.tsx`, `src/app/explore/ExploreMapWidget.tsx`, `src/components/NewAttractionModal/LeafletMapWidget.tsx`, `src/components/AttractionSearchModal/AttractionSearchModal.tsx`

This scatters request construction and error handling across the codebase and makes the API layer untestable in isolation.

## Goal
Every client-side network call goes through a dedicated service function in `src/services`; no component, hook, or context calls `fetch` directly.

## Requirements
- Create `src/services/` with one flat module per domain: `auth.service.ts`, `trips.service.ts`, `attractions.service.ts`, `attractionTypes.service.ts`, `attractionCategories.service.ts`, `moodTags.service.ts`, `expenses.service.ts`, `residences.service.ts`, `flights.service.ts`, `collaborators.service.ts`, `fx.service.ts`, `routeTransit.service.ts`.
- Each service function wraps one API endpoint call, returns typed data, and throws/handles non-OK responses consistently (pick one error convention and use it everywhere).
- Move every raw `fetch()` call listed above into the matching service function. The calling component/hook/context imports and calls the service instead.
- Preserve exact request payloads, headers, and response handling — this is a structural move, not a behavior change.

## Constraints
- Zero behavior change. Verify by comparing request URLs/methods/bodies before and after for each moved call.
- Do not touch `src/app/api/**/route.ts` — those are server-side route handlers, out of scope.
- No barrel file (`src/services/index.ts`) yet — that's handled in the follow-up task `component-barrel-files`.
- Run typecheck/build after this pass before moving to the next task in the goal.

## Out of scope
- `src/lib` utility extraction (separate task: `shared-utils-extraction`).
- Barrel files (separate task: `component-barrel-files`).
- Any new features, caching strategy changes, or API contract changes.

## Implementation Notes
- Files created: 14 service modules under `src/services/` — `auth.service.ts`, `users.service.ts`, `analytics.service.ts`, `trips.service.ts`, `collaborators.service.ts`, `expenses.service.ts`, `fx.service.ts`, `attractions.service.ts`, `attractionTypes.service.ts`, `attractionCategories.service.ts`, `moodTags.service.ts`, `geo.service.ts`, `geocoding.service.ts`, `routeTransit.service.ts` (relocated verbatim from `src/app/trips/[id]/routeService.ts`, which was deleted).
- Files modified (fetch calls replaced with service calls): `src/contexts/AuthContext.tsx`, `src/hooks/useMoodTags.ts`, `src/hooks/useAttractionTypes.ts`, `src/hooks/useAttractionCategories.ts`, `src/app/page.tsx`, `src/app/login/LoginClient.tsx`, `src/app/register/RegisterClient.tsx`, `src/app/profile/ProfileClient.tsx`, `src/app/explore/ExploreClient.tsx`, `src/app/explore/ExploreMapWidget.tsx`, `src/app/trips/TripsClient.tsx`, `src/app/new-trip/NewTripClient.tsx`, `src/app/trips/[id]/edit/EditTripClient.tsx`, `src/app/trips/[id]/TripDetailClient.tsx`, `src/app/trips/[id]/CalendarSection.tsx`, `src/app/trips/[id]/TripDayMapWidget.tsx` (import path only), `src/app/admin/AdminClient.tsx`, `src/app/analytics/AnalyticsClient.tsx`, `src/components/TripSharingPanel/TripSharingPanel.tsx`, `src/components/ExpensesPanel/ExpensesPanel.tsx`, `src/components/NewAttractionModal/NewAttractionModal.tsx`, `src/components/AddResidenceModal/AddResidenceModal.tsx`, `src/components/CitiesMap/CitiesMap.tsx`, `src/components/CountriesMap/CountriesMap.tsx`, `src/components/NewAttractionModal/LeafletMapWidget.tsx`, `src/components/AttractionSearchModal/AttractionSearchModal.tsx`.
- Deviations from brief:
  - **Error convention (revised after user feedback)**: added `src/services/http.ts` (`ApiError` class + `parseOrThrow<T>()` helper). Service functions now parse the response and throw `ApiError` (carrying `status` + parsed body) on a non-OK status **by default**, returning typed data directly on success. A function is kept returning the raw `Promise<Response>` only where its actual call sites need genuinely different handling that throwing would break — verified per-function, not assumed:
    - `auth.service#login` — LoginClient and RegisterClient's auto-login show different messages/redirects on failure.
    - `trips.service#getTrip` — TripDetailClient branches on 403 vs 404 vs success; EditTripClient only branches on 404 vs success.
    - `trips.service#updateTrip`, `expenses.service#saveExpenses` — 4 different callers (parse-always, optimistic-rollback, fire-and-forget, and a Promise.all pair that reads both responses conditionally).
    - `attractions.service#updateTripAttractionSchedule` — `TripDetailClient.handleFlightUpdate` falls back to reading a sibling response's already-parsed body when this one fails; two other callers handle it differently again.
    - `attractions.service#removeAttractionFromTrip` — one caller checks `ok` to decide whether to roll back optimistic state; another (`CalendarSection`'s custom-slot delete) never checked status at all, so throwing there would newly skip a local-state update that previously always ran.
    - `attractionTypes.service#deleteAttractionType`, `moodTags.service#deleteMoodTag`, `moodTags.service#seedMoodTags`, `attractionCategories.service#migrateLegacyTypes` — all fire-and-forget in the original code (no `res.ok` check, some with no surrounding try/catch at all); converting would have introduced new failure paths that block a `window.location.reload()` the original always ran.
    All other functions (the majority) were converted. Every conversion's call site(s) were checked individually for behavior equivalence before converting.
  - **Extra service modules beyond the originally-listed 12**: added `users.service.ts` (profile/password/search — these are `/api/users/*`, distinct from `/api/auth/*`), `analytics.service.ts` (personal + global analytics), `geo.service.ts` (city/country boundary polygons + world GeoJSON), `geocoding.service.ts` (external Nominatim reverse/search calls), and `http.ts` (shared `ApiError`/`parseOrThrow` — infrastructure, not a domain service) — none were in the original 12-module list but were required to cover every call site found during implementation, including two files (`src/app/page.tsx`, `src/app/analytics/AnalyticsClient.tsx`) that the original QC audit missed.
  - **`residences.service.ts` / `flights.service.ts` skipped**: residences and flights are created/updated through the exact same `/api/trips/{id}/attractions` and `/api/attractions/{id}` endpoints as regular attractions (differentiated only by payload `subtype`). Creating separate files that would just re-export `attractions.service.ts` functions under different names would add indirection with no payoff, so residence/flight calls were folded into `attractions.service.ts`.
  - Preserved one existing behavioral quirk verbatim rather than "fixing" it during the move: `NewTripClient.tsx`'s trip-creation call builds `Authorization: Bearer ${token}` with no prior null-guard, so a null token literally sends `"Bearer null"` — `trips.service.ts#createTrip` accepts `token: string | null` to keep that exact (pre-existing) behavior rather than silently changing it to `Bearer `.
- New design tokens used: none (no UI change).

Verification (after the error-convention revision): `npx tsc --noEmit` passes with no errors; `npm run build` completes successfully (Turbopack, all 33 routes generated); `npm run lint` reports the identical 47 errors / 23 warnings as the pre-change baseline (verified via `git stash`) — all pre-existing `react-hooks/set-state-in-effect` and `jsx-a11y` findings unrelated to this change, none introduced by it.

## Completion Summary
Built 15 modules under `src/services/` (14 domain services + a shared `http.ts` error helper) and migrated every raw `fetch()` call out of ~26 components/hooks/contexts/pages into the matching service function, with zero UI or observable-behavior change. Mid-task, the user corrected the service error-handling convention: functions now parse and throw an `ApiError` internally by default, falling back to returning the raw `Promise<Response>` only for the ~9 functions whose call sites were checked and found to genuinely need it. Verified clean via `tsc`, `next build`, and `lint` (matching the pre-change baseline exactly). Confirmed done by the user on 2026-07-25.
