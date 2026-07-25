# Task: QC Follow-Up — Barrel Imports, Docs, DRY Modals/Spinners, Error & Loading Boundaries

Status: done
Track: B
Track reason: bug fixes, documentation, refactor/cleanup, and consolidation of already-existing visual patterns (modal shell, spinner) into shared components — no new visual design required, every pattern already exists in the app.

## Problem
A full-tree `/qc` architecture sweep of `src/` surfaced several violations of this project's established architecture standards:

1. Two imports bypass the `src/lib` barrel, deep-reaching into individual files even though the symbols are already exported from `@/lib`.
2. Most of `src/lib/*.ts` (validation, geometry, date, expenses, openingHours, adminForms, auth) and nearly all `*.types.ts` prop interfaces have zero JSDoc, despite some containing non-trivial or security-relevant logic (`auth.ts`, `expenses.ts`, `geometry.ts`).
3. Modal shell markup (backdrop/dialog/header/close-button), auth-form chrome (error banner, field errors, submit spinner), and loading-spinner markup are each duplicated near-identically across 3+ files with no shared component to consolidate them.
4. There is no route-level `error.tsx` or `loading.tsx` anywhere under `src/app/`, and several client components silently swallow fetch failures with no user-facing error message — users get no feedback when a request fails.

## Goal
Bring `src/` back into full compliance with the project's `/qc` checklist: clean barrel imports, documented `lib`/hooks/types, deduplicated modal/spinner/form UI via shared components, and real error/loading boundaries (route-level plus surfaced client-side errors) so failures are never silently swallowed.

## Requirements

**Barrel imports**
- `src/components/NewAttractionModal/NewAttractionModal.tsx:29` — change `from "@/lib/openingHours"` to `from "@/lib"`
- `src/app/api/auth/register/route.ts:5` — change `from "@/lib/avatarConstants"` to `from "@/lib"`

**Documentation** — add JSDoc to exported functions/interfaces in:
- `src/lib/validation.ts`, `src/lib/geometry.ts`, `src/lib/date.ts`, `src/lib/expenses.ts`, `src/lib/openingHours.ts`, `src/lib/adminForms.ts`, `src/lib/auth.ts` (this one is security-relevant — document `JwtPayload`, `signToken`, `getUserFromRequest` carefully)
- `src/hooks/useAttractionCategories.ts` (`invalidateAttractionCategoriesCache`, `useAttractionCategories`)
- `*.types.ts` prop interfaces across `src/components/**` (at minimum: `TripCard.types.ts`, `AddFlightModal.types.ts`, `AttractionSearchModal.types.ts`, `TripSharingPanel.types.ts`, `AddCustomSlotModal.types.ts`, `ExploreCard.types.ts`)

**DRY — extract shared components**
- Create a shared `Modal`/`ModalShell` component (backdrop + dialog + header + close button, `role="dialog" aria-modal`) and migrate `AddFlightModal`, `AddCustomSlotModal`, `AddFreeSlotModal`, `AddResidenceModal`, `AttractionSearchModal`, and `NewAttractionModal` to use it instead of hand-rolling the shell each time.
- Create a shared `Spinner` component and use it in `ProfileClient.tsx` (lines 307, 401) and `ExploreClient.tsx` (lines 18, 452) instead of independently reinvented markup.
- Extract shared auth-form chrome (API error banner, field-error markup, submit-spinner button) used by both `LoginClient.tsx` and `RegisterClient.tsx` into a shared component (e.g. `AuthFormField`/`FormError`) or shared partial.

**Error & loading boundaries**
- Add route-level `loading.tsx` and `error.tsx` under `src/app/` — at minimum for `trips/`, `trips/[id]/`, `explore/`, `profile/`, `admin/`, `analytics/`, `login/`, `register/`, `new-trip/`, and a root-level fallback.
- Replace silent failure swallowing with user-facing error state:
  - `src/app/trips/TripsClient.tsx:24` (`.catch(() => setTrips([]))`)
  - `src/app/trips/[id]/TripDetailClient.tsx:174,182,196,220` (`catch { /* silent */ }`)
  - `src/app/explore/ExploreClient.tsx:72,82` (empty catches)

**Minor cleanup**
- `src/services/expenses.service.ts:1-11` — `saveExpenses` returns a raw `Promise<Response>` like a few other intentional exceptions in the service layer, but unlike its peers it has no explanatory comment. Add one for consistency with the established convention, or convert it to parse/throw if there's no real reason for the exception.
- `src/components/SectionCard/SectionCard.tsx` — remove the unnecessary `'use client'` directive; it has no hooks, handlers, or browser APIs and can be a server component.

## Constraints
- Do not change visual design — the modal shell, spinner, and form chrome being extracted already exist in the app; this is consolidation, not a redesign. Match existing CSS Module class structures/styling as closely as possible when extracting.
- Preserve the existing service-layer convention (parse/throw by default, documented exceptions) — see `[[feedback-service-error-convention]]`-style precedent already in the codebase.
- Preserve the existing barrel-file pattern in `src/lib/index.ts`, `src/components/index.ts`, etc. — new shared components must be added to the relevant barrel.

## Out of scope
- Splitting the oversized `*Client.tsx` files (`AdminClient.tsx` 866 lines, `TripDetailClient.tsx` 806 lines, `EditTripClient.tsx` 522 lines, `ProfileClient.tsx` 518 lines) into smaller subcomponents — flagged by QC as a componentization candidate but not a hard rule failure; track separately if desired.
- Any rules that already passed: data fetching layer, utility separation, Next.js Image/Link usage, TypeScript `any` usage, state/hydration, security/env vars.

## Implementation Notes
- Files created:
  - `src/components/Modal/` (Modal.tsx, Modal.utils.ts `useModalController`, Modal.types.ts, index.ts) — shared dialog shell + a11y controller (portal mount, focus trap, Escape-to-close, scroll lock, trigger-focus restore)
  - `src/components/Spinner/` — shared loading indicator, `variant="ring"` (full-area) and `variant="icon"` (inline button spinner)
  - `src/components/FormErrorBanner/`, `src/components/FormFieldError/` — shared API-error banner and field-error paragraph
  - `src/components/RouteLoading/`, `src/components/RouteError/` — shared route-boundary UI rendered by every `loading.tsx`/`error.tsx`
  - `loading.tsx` + `error.tsx` for: root, trips, trips/[id], trips/[id]/edit, explore, profile, admin, analytics, login, register, new-trip (22 files)
- Files modified: barrel-import fixes (NewAttractionModal.tsx, api/auth/register/route.ts); 6 modals migrated to ModalShell (AddFlightModal, AddCustomSlotModal, AddFreeSlotModal, AddResidenceModal, AttractionSearchModal, NewAttractionModal); ExploreClient/ProfileClient migrated to Spinner (+ removed now-dead spinner CSS); LoginClient/RegisterClient migrated to FormErrorBanner/FormFieldError/Spinner (+ removed now-dead duplicated CSS); TripsClient/TripDetailClient/ExploreClient silent catches replaced with user-facing error state + retry; JSDoc added to 7 lib files, 1 hook, 6 `.types.ts` files; expenses.service.ts comment; SectionCard `'use client'` removed.
- Deviations from brief:
  - `ModalShellStyles` ended up typed as `{ readonly [key: string]: string }` rather than named required fields — matches how Next.js actually types `*.module.css` imports project-wide; a named-fields interface didn't structurally match real CSS-module imports and failed `tsc`.
  - `AttractionSearchModal` didn't have a focus trap or trigger-focus-restore before (only Escape-to-close); adopting the shared `ModalShell` gave it the same focus-trap/restore behavior as the other 5 modals. This is a real behavior change (a11y improvement), not just a visual no-op — flagging per the "no visual change" constraint even though it's not visual.
  - Added a `beforeBody` slot to `ModalShell` (not in the original plan) after discovering `AttractionSearchModal`'s search bar must stay pinned outside the scrollable body — without it the search bar would have scrolled away with the results list.
- New design tokens used: none — every new component reuses existing CSS custom properties and each modal's own CSS module classes.
- Lint note: `eslint`/`next lint` reports pre-existing `react-hooks/set-state-in-effect` errors across many files this task didn't touch (AuthContext.tsx, AttractionsContext.tsx, MoodTagButton.tsx, MoodTagChip.tsx, LeafletMapWidget.tsx, useAttractionTypes.ts, useMoodTags.ts — verified via `git diff` showing zero changes to these files), confirming it's pre-existing and out of scope for this task. `tsc --noEmit` and `next build` both pass cleanly.
- Unrelated note: `.claude/skills/qc/SKILL.md` shows as modified in `git status` but was never touched by this task — flagging for the user's awareness, not part of this change set.

## Completion Summary
Remediated all four failed rules from the prior `/qc` sweep: fixed both barrel-import violations; documented 7 `lib` files, 1 hook, and 6 prop-interface files; built and adopted four shared components (`ModalShell`, `Spinner`, `FormErrorBanner`, `FormFieldError`) to eliminate modal/spinner/auth-form duplication across 6 modals and the login/register pages; and added route-level `loading.tsx`/`error.tsx` for all 11 routes plus user-facing error states with retry for every previously-silent catch block in `TripsClient`, `TripDetailClient`, and `ExploreClient`. Verified via `tsc --noEmit`, `next build`, and `eslint` (clean aside from pre-existing issues in untouched files). Confirmed by the user 2026-07-25.
