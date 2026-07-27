# Task: Demo / Admin Quick Sign-In

Status: intake

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
