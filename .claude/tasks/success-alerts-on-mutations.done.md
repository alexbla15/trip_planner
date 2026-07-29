# Task: Success Feedback on Create/Update Actions

Status: done

Track: A
Track reason: No toast/notification component exists anywhere in the codebase — this introduces a new, reusable UI pattern (shared toast system), not a tweak to an existing one.

## Problem
Create/update actions across the app give little or no feedback on success. Specifically:
- `AdminClient.tsx` does a full `window.location.reload()` after every successful create/update/delete (categories, types, mood tags) instead of showing a message — jarring and slow.
- `ProfileClient.tsx`'s profile name/avatar save (`handleSave`) has no success feedback at all — the edit form just closes silently.
- The only existing success message anywhere (`ProfileClient.tsx` password-change, `pwSuccess`) is a bespoke inline paragraph, not reusable elsewhere.

## Goal
Whenever the user successfully creates or updates data anywhere in the app, they see a brief, consistent success confirmation — without a jarring full-page reload.

## Requirements
- Build one shared, reusable toast/alert component (e.g. `src/components/Toast/`) — success (and error, for consistency) variants, auto-dismiss after ~3s, accessible (`role="status"`, `aria-live="polite"`), dismissible manually
- Wire it into a lightweight app-wide provider/context so any client component can trigger a toast (e.g. `useToast().success("Saved!")`)
- Replace `AdminClient.tsx`'s `window.location.reload()`-after-success pattern with: refetch/update local state + show a success toast (no full page reload) for category/type/mood-tag create, update, and delete
- Add a success toast to `ProfileClient.tsx`'s `handleSave` (name/avatar save) — currently silent
- Audit other create/update flows in the app (trip create/edit, attraction create/edit, calendar block create/edit) and add the same success toast where a mutation currently gives no feedback — keep existing feedback (e.g. navigation-on-success) if it already reads as sufficient confirmation, using judgment rather than adding redundant toasts everywhere
- Keep the existing password-change inline success message OR migrate it to the new toast system for consistency — developer's call, note the decision

## Constraints
- CSS Modules only, consistent with `docs/DESIGN_SYSTEM.md`
- No new npm dependency required — build the toast component from scratch (simple enough not to justify a library like `sonner`/`react-hot-toast`), unless the developer finds a strong reason otherwise
- Must not block or delay the UI action itself — toast is a non-blocking confirmation, not a modal

## Out of scope
- Error-state redesign beyond reusing the same component's error variant
- Undo actions inside the toast (e.g. "Undo delete")

## Design Brief

### Architecture
- Follow the existing context convention: add `src/contexts/ToastContext.tsx` (`ToastProvider` + `useToast()` hook), wired into `src/app/Providers.tsx` alongside `AuthProvider`/`AttractionsProvider` (outermost or innermost doesn't matter — it doesn't depend on auth/attractions state).
- `useToast()` returns `{ success(message: string): void; error(message: string): void }`. Internally: a `toasts` array of `{ id, variant, message }` in `useState`, each auto-removed via `setTimeout` after 3000ms (per Forms & Feedback `toast-dismiss` guideline: 3–5s).
- Rendered UI lives in `src/components/Toast/` (`Toast.tsx` — single toast; `ToastViewport.tsx` — the fixed-position stack; `Toast.module.css`; `Toast.types.ts`), rendered once from `ToastProvider` (portal to `document.body` via `createPortal`, following the existing modal-portal pattern in `docs/LEARNINGS.md`: `mounted` state gate + `useEffect`).

### Visual design
- **Variants:** `success` (left border / icon `var(--color-success)`, `Check` icon in a circular badge) and `error` (`var(--color-error)`, `AlertCircle` icon) — reuses the existing feedback color tokens, no new colors invented.
- **Card:** `background: var(--color-surface)`, `border-left: 4px solid` (success/error color), `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-lg)`, `padding: 14px 16px`, min-width 280px / max-width 360px on desktop, `100%` width (minus 16px side margins) on mobile.
- **Content layout:** icon (20px, `aria-hidden`) + message text (`--text-sm`, weight 500, `var(--color-text-primary)`) in a flex row, gap 10px, plus a trailing dismiss `X` icon-button (16px, `var(--color-text-tertiary)`, `aria-label="Dismiss notification"`) — 44×44px hit area via padding even though the visible icon is small (Touch & Interaction `touch-target-size`).
- **Icons:** `Check` (success), `AlertCircle` (error), `X` (dismiss) — all already used elsewhere in this codebase (`AdminClient.tsx`), so no new icon vocabulary.

### Position & stacking
- **Desktop/tablet (≥768px):** fixed, `top: 88px` (below the 64px navbar + 24px gap), `right: 24px`, `z-index: 1200` (matches the LEARNINGS.md precedent of 1100+ for floating overlays, cleared above Leaflet's 1000/700 stack in case a toast fires on a map page).
- **Mobile (<768px):** fixed, `bottom: 16px`, centered (`left: 16px; right: 16px`), so it doesn't collide with a fixed top nav and sits in comfortable thumb reach — one central position class, breakpoint-driven via CSS Modules, not two components.
- **Stacking:** new toasts append to the array and render newest-last in DOM order but visually stack newest-on-top via `flex-direction: column-reverse` (desktop, growing upward from top) / newest-on-bottom via `column-reverse` inverted for the mobile bottom position (growing upward from bottom) — in both cases the newest toast appears closest to the screen edge it's anchored to, gap `8px` between stacked toasts. Cap visible stack at 3; a 4th arrival silently drops the oldest (avoids unbounded stacking during a rapid sequence of admin actions).

### Motion
- **Enter:** slide + fade from the anchored edge (desktop: `translateX(16px) → 0` + `opacity 0 → 1`; mobile: `translateY(16px) → 0` + `opacity 0 → 1`), `var(--duration-base)` (200ms) `var(--easing-out)` — matches `motion-meaning` (the direction communicates where it came from) and stays within the 150–300ms band.
- **Exit:** fade only (`opacity 1 → 0`, no transform) over `150ms` (`var(--duration-fast)`, exit faster than enter per `exit-faster-than-enter`).
- Wrap both in `@media (prefers-reduced-motion: reduce)` → instant opacity toggle, no transform (per `reduced-motion`).

### Accessibility
- Viewport container: `aria-live="polite"` + `aria-atomic="false"` (announces each new toast without re-reading the whole stack) — matches the codebase's existing `aria-live="polite"` convention (`ExploreSection.tsx`, `pwSuccess` paragraph).
- Each toast: `role="status"` for success, `role="alert"` for error (alert is assertive by default — appropriate since an error is more urgent).
- Must never steal focus (per `toast-accessibility`) — no `autoFocus`, no focus trap.
- Dismiss button keyboard-reachable, standard `<button>` semantics, `aria-label` as noted above.

### Migration decisions (for the developer to execute, already decided)
- `AdminClient.tsx`: replace every `window.location.reload()` after a successful create/update/delete with `invalidate*Cache()` (already called) + a `toast.success("<Entity> saved")`/`"<Entity> deleted"` call. The existing SWR-style hooks (`useAttractionTypes`, etc.) already refetch after cache invalidation, so dropping the reload is safe.
- `ProfileClient.tsx` `handleSave`: add `toast.success("Profile updated")` on success, keep existing behavior otherwise (form closes as it does today).
- `ProfileClient.tsx` password-change (`pwSuccess`): **migrate to the shared toast** for consistency (don't keep two success-feedback mechanisms in the same file) — remove the bespoke inline paragraph and its `setTimeout` dismissal logic in favor of `toast.success("Password updated")`.
- Trip/attraction/calendar create-edit flows: audit each for existing feedback (e.g. navigation away on success reads as sufficient confirmation for a full-page form submit) before adding a toast — only add where a mutation currently gives zero feedback and the user stays on the same view afterward.

### Icon needed
No new icons — `Check`, `AlertCircle`, `X` are all already imported from `lucide-react` in `AdminClient.tsx`.

## Implementation Notes
- Files created: `src/contexts/ToastContext.tsx`, `src/components/Toast/{Toast.tsx,ToastViewport.tsx,Toast.module.css,Toast.types.ts,index.ts}`
- Files modified: `src/app/Providers.tsx` (wired `ToastProvider`), `src/components/index.ts` (barrel export), `src/app/admin/AdminClient.tsx` (all 5 `.addBtn`-driven mutations now toast instead of `window.location.reload()`), `src/app/profile/ProfileClient.tsx` (`handleSave` toasts; password-change `pwSuccess` state/paragraph fully removed and migrated to `toast.success`), `src/app/trips/[id]/TripDetailClient.tsx` (attraction/residence/flight create+update, 6 handlers), `src/app/trips/[id]/CalendarSection.tsx` (custom-slot create/update/delete + day-range save), `src/components/TripSharingPanel/TripSharingPanel.tsx` (privacy toggle, add/remove collaborator — only in `mode="live"`; `mode="draft"` branches return early before any persistence happens, so no toast fires there since nothing is actually saved yet), `src/hooks/useAttractionTypes.ts` / `useAttractionCategories.ts` / `useMoodTags.ts`
- Deviations from brief:
  1. **Real bug found and fixed, not anticipated by the brief:** `invalidate*Cache()` in the three admin hooks only cleared the module-level cache — it did **not** cause already-mounted components to re-fetch (their `useEffect` has an empty dep array, so it only reads the cache once on mount). Without `window.location.reload()`, `AdminClient.tsx`'s lists would have gone stale after every mutation despite the toast firing. Added a subscriber/pub-sub mechanism to all three hooks (`useAttractionTypes`, `useAttractionCategories`, `useMoodTags`) so `invalidate*Cache()` now also triggers every mounted instance to reload. This was necessary for the reload removal to actually work, not just cosmetic.
  2. **Scope extended beyond the brief's explicit examples:** the brief named "trip create/edit, attraction create/edit, calendar block create/edit" as an audit list. A background audit found trip create/edit/delete already have adequate feedback (navigation), so those were left alone. It also surfaced that `TripSharingPanel.tsx` (privacy toggle, add/remove collaborator) and several `CalendarSection.tsx` custom-slot handlers had **silently swallowed errors** (`catch { /* silent */ }`), not just missing success feedback — added `toast.error(...)` to those catch blocks in addition to `toast.success(...)` on the happy path, since a silent failure is a worse gap than a missing confirmation.
  3. Did **not** add a toast to `CalendarSection.tsx`'s `saveCalRange` (day-range preference auto-save) success path — it fires on every hour dropdown change and would spam toasts; only added `toast.error` for its failure case, which was previously fully silent.
  4. Password-change: per the brief's explicit instruction, migrated to the shared toast rather than keeping the old inline `pwSuccess` paragraph — removed the state, its `setTimeout` auto-dismiss, and the now-unused `.pwSuccess` CSS class.
- New design tokens used: none — reused `--color-success`, `--color-error`, `--shadow-lg`, `--radius-lg`, spacing scale, and animation duration/easing tokens exactly as specified in the Design Brief.
- `tsc --noEmit`, `next build` (full production build, all 35 routes) both clean. `eslint` on touched files shows only pre-existing, repo-wide `react-hooks/set-state-in-effect` and `react/no-unescaped-entities` findings unrelated to this change (confirmed the same `set-state-in-effect` pattern already exists untouched in `src/components/Modal/Modal.utils.ts`, so it's pre-existing technical debt across the codebase, not a regression introduced here) — none of the new code added by this task introduces a new instance of either rule.
- Also fixed, at user's request during review: a `fdprocessedid` hydration-mismatch console warning on `ThemeToggle`'s button, caused by a browser form-filler extension injecting the attribute before hydration (confirmed via the dev-overlay diff, not assumed) — silenced with `suppressHydrationWarning` since it's cosmetic and unrelated to any app code.

## Completion Summary
Built a shared toast notification system (`ToastContext` + `Toast`/`ToastViewport` components) per the Design Brief, and wired `toast.success`/`toast.error` into every create/update/delete flow that previously gave no feedback or relied on a full-page reload: Admin (categories/types/moods), Profile (save + password change, migrated off its old bespoke inline message), Trip Detail (attractions/residences/flights), Calendar (custom slots, day-range save), and Trip Sharing (privacy toggle, collaborators). Along the way, fixed a real underlying bug the reload had been masking — the admin data hooks' cache-invalidation didn't actually refetch already-mounted components — and fixed a real browser-extension-caused hydration warning as a side request during review. Confirmed by user. Closed 2026-07-29.
