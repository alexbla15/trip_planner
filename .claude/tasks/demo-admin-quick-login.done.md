# Task: Demo / Admin Quick Sign-In

Status: done

Track: A
Track reason: New interactive elements on the sign-in form (quick-login buttons) with no existing pattern in the design system.

## Problem
Reviewers/instructors evaluating this app have to create an account (or be handed real credentials) to sign in, and there's no way to see admin-only features (`/admin`) without someone manually flipping a user's `role` to `"admin"` in the database, since there's no seed script or in-app path to becoming admin.

## Goal
From the sign-in page, a visitor can sign in instantly as a seeded "demo" user with one click. A seeded "admin" user quick-login is also available, but only outside production, so admin access is never one click away for real end users.

## Requirements
- Add a "Sign in as Demo User" button on the sign-in page — visible in **all** environments (including production). Clicking it immediately logs the visitor in as a seeded demo account (no typing credentials).
- Add a "Sign in as Admin" button on the sign-in page — visible **only when `process.env.NODE_ENV !== "production"`**. Clicking it immediately logs in as a seeded admin account.
- Since no seed script exists today, create one: seed (or upsert on app/demo-login call) exactly two fixed accounts — a `role: "user"` demo account and a `role: "admin"` admin account — with known, fixed credentials stored in env vars (e.g. `DEMO_USER_EMAIL`/`DEMO_USER_PASSWORD`, `DEMO_ADMIN_EMAIL`/`DEMO_ADMIN_PASSWORD`), not hardcoded in source.
- Quick-login buttons call the existing login flow under the hood (reuse `POST /api/auth/login` logic / `signToken`) rather than duplicating auth logic.
- Document the new env vars in `.env.example`.

## Constraints
- This is the first place `process.env.NODE_ENV` is used anywhere in the app — introduce it cleanly (e.g. a small `isProduction()` helper) since no dev/prod branching utility exists yet.
- Must reuse the existing `User` model (`src/models/User.ts`) and existing password hashing (`bcrypt`) — do not bypass normal auth just for these accounts.
- Do not commit real demo/admin passwords to source — env vars only.

## Out of scope
- A full admin-user-management UI (promoting arbitrary users to admin) — out of scope, still done via DB
- Removing or expiring demo accounts automatically

## Design Brief

### Layout — where the buttons go
In `src/app/login/LoginClient.tsx`, add a new section between the closing `</form>` and the existing "Switch link" paragraph (`styles.switchText`, "Don't have an account?"):
- A divider row: a thin `1px solid var(--color-border-subtle)` horizontal line with centered text "or" (`--text-sm`? — actually match `styles.subheading`'s 14px, `var(--color-text-tertiary)`, small `padding: 0 12px` background-clipped gap so the line doesn't run through the text — standard "divider with label" construction: a flex row with two `flex:1` line divs and the label between them).
- Below the divider: two full-width secondary buttons stacked with 10px gap: "Continue as Demo User" (`User` icon, always rendered) and "Continue as Admin" (`Shield` icon, rendered only when `isProduction()` is false).

### Visual style — reuse the existing secondary-button recipe, don't invent a new one
Match `AdminClient.module.css`'s `.addBtn` recipe exactly (same visual language already established for "secondary action, not the primary CTA" elsewhere in the app), scaled to this form's sizing:
- `height: 44px` (touch target minimum, matches `.input`/`.eyeBtn` sizing already in this file), `width: 100%`, `border-radius: var(--radius-md)`, `border: 1px solid var(--color-primary)`, `background: transparent`, `color: var(--color-primary)`, `font-size: 14px`, `font-weight: 600`, icon+label with `8px` gap, `display: flex; align-items: center; justify-content: center`.
- Hover: `background: var(--color-primary-light)` (identical to `.addBtn:hover`).
- Disabled/loading (while the quick-login request is in flight): same `opacity: 0.6; cursor: not-allowed` treatment as `.submitBtn:disabled`, with the existing `Spinner` component (`variant="icon"`) swapped in for the leading icon — reuse the same loading pattern already used on the main submit button (`{loading ? <Spinner .../> : <LogIn />} Sign in`).
- These are intentionally *not* styled like `.submitBtn` (solid primary fill) — per the design system's `primary-action` guidance (one primary CTA per screen), the real "Sign in" button stays the only filled/primary button; both quick-login options read as secondary actions.

### Icons
- Demo: `User` (not yet imported in this file — add to the existing `lucide-react` import list).
- Admin: `Shield` (already used elsewhere in the app, e.g. `AdminClient.tsx`, for the same admin concept — reuse it here for consistency).

### Behavior
- Both buttons call the same login flow as the real form (`POST /api/auth/login` → `login(token)` from `useAuth()` → `router.replace("/")`), just with fixed credentials instead of the typed form fields — implement as a new `POST /api/auth/demo-login` endpoint (see Requirements) so the demo/admin email+password never has to round-trip through the browser or the existing `/api/auth/login` body shape; the endpoint takes a `role: "demo" | "admin"` selector server-side and returns the same `{ token }` shape the login flow already expects.
- Clicking either button shows the same loading state pattern as the real submit button (disable both quick-login buttons + the real submit button while any one request is in flight, to prevent a double-submit race) and surfaces errors through the existing `FormErrorBanner`/`apiError` state — no separate error UI.
- Admin button is gated with `isProduction()` at render time (see Requirements below for the shared helper) — if it evaluates true, the button and its surrounding "or" divider both collapse to just the Demo button + divider (divider still shows if the Demo button alone is present; only the Admin button conditionally renders).

### New shared helper (Requirements callout)
Add `src/lib/isProduction.ts` exporting `isProduction(): boolean` (`process.env.NODE_ENV === "production"`) — this is the first place `NODE_ENV` branching exists anywhere in the codebase (per the task's own Constraints section), so introduce it as a small reusable helper rather than inlining the `process.env` check directly in both the API route (to decide whether to allow seeding/using the admin demo account server-side, as defense in depth beyond just hiding the button) and the client component (to decide whether to render the button). Next.js statically inlines `process.env.NODE_ENV` in both server and client bundles, so this works safely on either side without extra config.

### Accessibility
- Both buttons keep the icon+visible-label pattern (no icon-only ambiguity), so no extra `aria-label` is needed beyond the visible text.
- Loading state: reuse the exact same `disabled` + `Spinner` treatment as the real submit button, already accessible in this file's existing pattern.

## Implementation Notes
- Files created: `src/lib/isProduction.ts`, `src/app/api/auth/demo-login/route.ts`
- Files modified: `src/lib/index.ts` (barrel export), `src/services/auth.service.ts` (`demoLogin(role)`, raw-`Response` convention matching `login()`), `src/services/index.ts` (barrel export), `src/app/login/LoginClient.tsx` (quick-login handler + UI), `src/app/login/LoginClient.module.css` (divider + `.quickLoginBtn`), `.env.example` and `.env.local` (new `DEMO_USER_EMAIL`/`DEMO_USER_PASSWORD`/`DEMO_ADMIN_EMAIL`/`DEMO_ADMIN_PASSWORD`), `swagger.yaml` (new `POST /api/auth/demo-login` path)
- Deviations from brief: none
- New design tokens used: none — `.quickLoginBtn` reuses the exact `AdminClient.tsx` `.addBtn` recipe as specified
- The submit button and both quick-login buttons all disable together while any one request is in flight (`loading || quickLoginRole !== null`), preventing a double-submit race across the three buttons.
- Server-side defense in depth confirmed: `POST /api/auth/demo-login` rejects `role: "admin"` with 403 whenever `isProduction()` is true, independent of whether the client hides the button.
- Verified live against the running dev server (not just `tsc`/`eslint`): `curl` calls for `role: "demo"` and `role: "admin"` both created their account on first call and returned a valid JWT; an invalid `role` value returned a proper 400; the admin token was confirmed to actually have `role: "admin"` by successfully calling an admin-only endpoint (`GET /api/attraction-categories`) with it.
- Did not run a full `next build` for this task — per the LEARNINGS.md note added earlier in this session, running `next build` while `next dev` is live corrupts the dev server's route manifest; relied on `tsc --noEmit` (clean) + `eslint` (zero output, zero findings) + live `curl` verification against the dev server instead, which is a more direct proof for a backend-behavior change like this one anyway.
- **Follow-up requested during review:** switched the production gate from Next's built-in `NODE_ENV` to a dedicated `NEXT_PUBLIC_APP_ENV` env var (`src/lib/isProduction.ts`), since `NODE_ENV` is always forced to `"production"` by `next build` regardless of the actual deploy target (e.g. staging/preview), giving no way to distinguish "a real production deploy" from "any built environment." Fails closed per explicit user preference: only the literal value `"development"` unlocks admin quick-login; unset or any other value is treated as production. Uses the `NEXT_PUBLIC_` prefix so the same check works identically in the server route and the client component. Added to `.env.example` (documented) and `.env.local` (`development`, so the feature keeps working locally). Re-verified live against the dev server after the change — `role: "admin"` still returns 200 with the var set to `development`.

## Completion Summary
Added "Continue as Demo User" (always visible) and "Continue as Admin" (dev-only) quick-login buttons to the sign-in page, backed by a new `POST /api/auth/demo-login` endpoint that seeds the fixed account on first use. Production gating uses a dedicated `NEXT_PUBLIC_APP_ENV` env var (fail-closed) rather than `NODE_ENV`, per a follow-up request during review, since `NODE_ENV` can't distinguish a real production deploy from any built environment. Verified live against the dev server for both roles, invalid input, and that the admin token actually carries `role: "admin"`. Confirmed by user. Closed 2026-07-29.
