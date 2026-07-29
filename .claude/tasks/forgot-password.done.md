# Task: Forgot Password Flow

Status: done

Track: A
Track reason: New UI surface (forgot-password link, request form, email-sent state, reset-password page) with no existing pattern in the design system — no password-reset infrastructure exists today.

## Problem
Users who forget their password have no way to regain access to their account. The login page (`src/app/api/auth/login/route.ts` + its client form) has no "Forgot password?" affordance at all, and there is no reset-token model, reset endpoint, or reset page anywhere in the codebase.

## Goal
A user who forgets their password can request a reset email, click a link in that email, set a new password, and log back in — without any manual database intervention.

## Requirements
- Add a "Forgot password?" link on the sign-in form, near the password field
- Clicking it leads to a "Request reset" view: user enters their email, submits
- Backend: `POST /api/auth/forgot-password` (or similar) — looks up the user by email, generates a single-use, time-limited reset token, stores it (e.g. hashed token + expiry on the `User` document, or a separate collection), and sends a reset email containing a link with the token
- For security, the request-reset response must not reveal whether the email exists in the system (same success message either way)
- Backend: `POST /api/auth/reset-password` (or similar) — validates the token (exists, not expired, not already used), sets a new hashed password, invalidates the token
- Reset-password page (e.g. `/reset-password?token=...`) — new-password + confirm-password form, submits to the reset endpoint, shows success/error, then routes to sign-in
- Token expiry: 1 hour
- Show clear success/error feedback at each step (request sent, invalid/expired token, password updated)

## Constraints
- No email-sending library is currently installed (`package.json` has no nodemailer/resend/sendgrid) — this task must add one. Prefer a provider with a generous free tier suitable for a course project (e.g. Resend or Nodemailer+Gmail SMTP) — confirm choice with the user if unclear, since it requires a new API key / env var (e.g. `RESEND_API_KEY` or SMTP credentials) that the user will need to provision.
- Reset tokens must be stored hashed (never store the raw token), matching the existing password-hashing convention (`bcrypt`) used in `src/models/User.ts`
- Follow existing auth conventions: JWT/session handling in `src/lib/auth.ts`, Mongoose models in `src/models/`
- New env vars must be documented in `.env.example`

## Out of scope
- "Change password while logged in" — already exists on the profile page (`ProfileClient.tsx`) and is unaffected
- Social/OAuth login
- Rate-limiting the forgot-password endpoint against abuse (flag as a follow-up if time allows, but not required for this task)

## Design Brief

### Reuse the existing auth-card pattern — don't invent a new visual language
`LoginClient.tsx`/`RegisterClient.tsx` and their `.module.css` files already establish a complete, consistent "auth page" pattern: `.page` (full-height, `var(--hero-gradient)` background, centered), `.card` (`var(--color-surface)`, `radius-xl`, `shadow-xl`, max-width 440px, responsive padding), `.logo` (Plane icon + wordmark), `.heading`/`.subheading`, `.field`/`.label`/`.input` (44px height, focus ring), `.submitBtn` (full-width, primary fill, `Spinner` swap on loading), `FormErrorBanner` for API errors, `.switchText`/`.switchLink` for the "go back" link. Both new pages must be built from this exact pattern — same component-folder structure (`page.tsx` + `XClient.tsx` + `XClient.module.css`), not a new design language.

### 1. "Forgot password?" link (`LoginClient.tsx`)
- Add directly below the password field's wrapper (after the `FormFieldError` for password, before the Submit button), right-aligned, small text: `<Link href="/forgot-password">Forgot password?</Link>` styled like `.switchLink` (`var(--color-primary)`, 600 weight, 13px, underline on hover) — no new token needed.

### 2. `/forgot-password` — request-reset page
- New route: `src/app/forgot-password/page.tsx` (Server Component wrapper, like `login/page.tsx`) + `ForgotPasswordClient.tsx` + `.module.css`, built from the auth-card pattern above.
- Single field: email (`Mail` icon label, same as login), one submit button ("Send reset link", `Send` icon from `lucide-react` — not yet imported anywhere, matches the semantic icon mapping convention already followed in this codebase).
- On submit: call the new endpoint (see Requirements), then **always** show the same success state regardless of whether the email existed (per the task's own security requirement) — replace the form with a simple confirmation message inside the same card: a `Mail`-icon accent circle (reuse the `iconCircle`-style circular icon treatment already used in `StatCardsGrid`/`Navbar`'s avatar, i.e. `background: var(--color-primary-light); color: var(--color-primary); border-radius: var(--radius-full)`) + heading "Check your email" + body text "If an account exists for that email, we've sent a link to reset your password." + a `.switchLink`-styled "Back to sign in" link.
- Loading state: identical `Spinner` swap pattern as `LoginClient`'s submit button.
- Below the form (while still in the form state, not yet submitted): a `.switchText`-styled "Remembered your password? Sign in" link back to `/login`.

### 3. `/reset-password` — set-new-password page
- New route: `src/app/reset-password/page.tsx` + `ResetPasswordClient.tsx` + `.module.css`, same auth-card pattern.
- Reads `token` from the URL query string (`useSearchParams`).
- Two fields: "New password" and "Confirm password" (both with the show/hide eye-icon toggle exactly like `LoginClient`'s password field — reuse that exact pattern, including `passwordWrapper`/`eyeBtn` CSS), one submit button ("Reset password", `Check` icon).
- Three possible states for the page body, replacing the form entirely (not a modal, not a toast — these are terminal states for this page):
  1. **No token in URL at all** (someone navigated here directly): show an error state immediately — accent circle in `var(--color-error)`/`var(--color-error)`-tinted background (mirroring the success circle's construction but with the error token), heading "Invalid reset link", body "This password reset link is invalid. Request a new one.", link to `/forgot-password`.
  2. **Invalid/expired token** (only known after the submit attempt fails with that specific reason): same error-state visual as above, triggered after a failed submit, replacing the form.
  3. **Success**: same success-circle construction as the forgot-password page's confirmation state, heading "Password updated", body "You can now sign in with your new password.", primary-styled (`.submitBtn`-style, not `.switchLink`) button/link to `/login` since this is the primary next action here (per `primary-action`: one primary CTA per screen — the login link is `/login`, not the whole page).
- Client-side validation before submit: passwords match, minimum length — reuse the exact same rule (8 chars minimum) and inline `FormFieldError` pattern already used in `ProfileClient.tsx`'s password-change form.
- On successful reset, do **not** auto-log-in the user (a reset flow ending in an active session for an account whose password was reset is a mildly risky implicit assumption) — show the success state with an explicit "Sign in" link/button instead, requiring the fresh password to be typed once.

### Icons needed (new to this codebase — check before assuming already imported)
- `Send` (request-reset submit button) — new import from `lucide-react`.
- `Mail` and `Check` are already imported elsewhere (`LoginClient.tsx`, `ProfileClient.tsx`) — reuse.

### Accessibility
- Both new forms follow the exact `useId()` + `aria-required`/`aria-invalid`/`aria-describedby` pattern already established in `LoginClient.tsx`'s fields — nothing new to design here, just replicate.
- Success/error terminal states use `role="status"`/`role="alert"` respectively (matching the `Toast` component's convention from the earlier `success-alerts-on-mutations` task, for consistency across the app's few "state replaces content" patterns).

### Backend note for the developer (design-adjacent, since it shapes the UI's states)
The three reset-password page states above map directly to distinct backend outcomes the developer needs to distinguish in the API response (token missing/malformed vs. token valid-but-expired-or-used vs. success) — see the task's own Requirements section for the token/email mechanics.

## Implementation Notes
- Files created: `src/lib/passwordReset.ts` (raw-token generation + SHA-256 hashing), `src/lib/email.ts` (Resend wrapper, server-only, same exclusion treatment as `mongoose.ts`/`auth.ts`), `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`, `src/app/forgot-password/{page.tsx,ForgotPasswordClient.tsx,ForgotPasswordClient.module.css}`, `src/app/reset-password/{page.tsx,ResetPasswordClient.tsx,ResetPasswordClient.module.css}`
- Files modified: `src/models/User.ts` (`resetTokenHash`/`resetTokenExpiry`, both `select: false`), `src/lib/validation.ts` + `src/lib/index.ts` (new `validateForgotPasswordForm`/`validateResetPasswordForm`), `src/services/auth.service.ts` + `src/services/index.ts` (`forgotPassword`, `resetPassword`), `src/app/login/LoginClient.tsx` + `.module.css` (new "Forgot password?" link), `.env.example` / `.env.local` (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`), `swagger.yaml` (two new paths)
- Deviations from brief: none functionally — chose to build the reset URL from `new URL(req.url).origin` inside the route rather than adding a new `APP_URL` env var, since the request's own origin is always correct and avoids a config value that could drift from the actual deploy domain.
- New design tokens used: none — both new pages are copy-pasted from the existing `LoginClient` auth-card CSS module (by design, per the brief), plus one new `.iconCircle`/`.iconCircleError` treatment built entirely from existing tokens (`--color-primary-light`/`--color-primary`, `--color-error`, `--radius-full`).
- **Real bug found and fixed during live verification, not by reading code alone:** `POST /api/auth/forgot-password` built its generic success response as a single `NextResponse.json(...)` object at module scope, reused across every request. A `NextResponse`'s body is a stream — once sent for the first request, reusing the same instance for a second request silently returns an empty body (confirmed via `curl`: first call returned the full JSON, second call returned nothing with a `200`). Fixed by building the response fresh inside the handler on every call. This is exactly the kind of bug static checks don't catch — `tsc`/`eslint` were both clean on the original code.
- **Second issue hit during live verification:** after adding `resetTokenHash`/`resetTokenExpiry` to `User.ts`, the already-running dev server process kept using its in-memory Mongoose model from before the schema change (the `mongoose.models.User || mongoose.model(...)` re-registration guard, per `docs/LEARNINGS.md`, correctly prevents "Cannot overwrite model" errors on hot-reload, but also means a genuine schema change doesn't take effect until the process restarts — HMR re-evaluates route modules but the cached model object survives). A reset-password call against a token that was definitely persisted correctly (confirmed via a direct DB write/read outside the app) still failed with `INVALID_TOKEN` until the dev server was fully restarted. Not a code bug — a dev-process-lifetime issue worth remembering for any future Mongoose schema change.
- **Verified live end-to-end, not just statically:** seeded a real reset token directly in MongoDB (bypassing email delivery, since the configured Resend sender `onboarding@resend.dev` can only deliver to the account owner's own address without a verified domain), called `POST /api/auth/reset-password` with it — succeeded, logged in with the new password — succeeded, then replayed the same (now-consumed) token — correctly rejected as `INVALID_TOKEN`, confirming single-use. Also verified `POST /api/auth/forgot-password` returns an identical generic body for both a real and a nonexistent email. Restored the demo account's password back to its documented `.env.local` value afterward so the demo quick-login button (task 6) keeps working with the documented credentials.
- `tsc --noEmit` and `eslint` (scoped to all touched/new files) both clean, no findings at all.
- Did not run a full `next build` for this task, per the now-established LEARNINGS.md guidance (it corrupts a concurrently-running `next dev`) — relied on `tsc`/`eslint` plus the live end-to-end verification above instead.
- Note for the user: `onboarding@resend.dev` (the default `RESEND_FROM_EMAIL`) can only send to the Resend account's own verified email address — real users won't receive reset emails until a real sending domain is verified in the Resend dashboard and `RESEND_FROM_EMAIL` is updated to an address on that domain.

## Completion Summary
Built the full forgot-password flow: a "Forgot password?" link on sign-in, a `/forgot-password` request page (generic response regardless of whether the email exists), an emailed reset link via Resend, and a `/reset-password` page handling missing/invalid/expired-token and success states. Tokens are hashed at rest, single-use, and expire in 1 hour. Two real bugs were caught and fixed via live verification against the running server and real DB data (a reused-response-object bug emptying the second request's body; a dev-server model-cache staleness issue after the schema change) rather than relying on static checks alone. Confirmed by user. Closed 2026-07-29.
