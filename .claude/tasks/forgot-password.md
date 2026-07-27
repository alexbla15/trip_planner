# Task: Forgot Password Flow

Status: intake

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
