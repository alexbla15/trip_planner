# Task: Auth API & Pages

Status: done

Track: A
Track reason: new login and register page UI surfaces, plus new AuthContext shared state layer

## Problem
The app has no authentication. All data is currently hardcoded mock data. Before any real API routes can be user-scoped, we need a way to identify who is logged in — a registered user with a hashed password and a JWT token. Travelers need to log in to see only their own trips.

## Goal
Implement JWT-based authentication: User Mongoose model, register/login/me API routes, login and register pages, and an AuthContext that makes the current user available across the whole app.

## Requirements

### Backend
- Install `bcryptjs` + `@types/bcryptjs` and `jsonwebtoken` + `@types/jsonwebtoken`
- Add `JWT_SECRET` to `.env.local` (generate a long random string)
- **User Mongoose model** (`src/models/User.ts`): fields `name`, `email` (unique), `password` (hashed), `avatarUrl?`, `createdAt`
- **POST /api/auth/register** — validate name/email/password, hash password with bcrypt (salt 12), save user, return `UserProfile` (no password)
- **POST /api/auth/login** — find user by email, compare password, return `{ token }` (JWT signed with JWT_SECRET, expires in 7 days); 401 on bad credentials
- **GET /api/users/me** — verify Bearer token from `Authorization` header, return `UserProfile`
- **PUT /api/users/me** — verify token, update `name` and/or `avatarUrl`, return updated `UserProfile`
- **Auth middleware helper** (`src/lib/auth.ts`): `getUserFromRequest(req)` — extracts and verifies JWT, returns decoded payload or throws; reuse across all protected routes

### Frontend
- **AuthContext** (`src/contexts/AuthContext.tsx`): stores `{ user, token, login, logout, loading }`, persists token in `localStorage`, exposes a `useAuth()` hook; wrap inside existing `Providers.tsx`
- **`/login` page** — email + password form; on success calls POST /api/auth/login, saves token via AuthContext, redirects to `/`; link to `/register`
- **`/register` page** — name + email + password form; on success calls POST /api/auth/register then POST /api/auth/login (auto-login), redirects to `/`; link to `/login`
- **Navbar** — replace hardcoded `"A"` avatar and `"Alex"` greeting with the logged-in user's initial and name; show "Log out" action in avatar dropdown or mobile menu; if no user is logged in, show "Log in" link instead of avatar
- **Dashboard greeting** — replace `"Alex"` with `user.name` from AuthContext
- **Route protection** — dashboard (`/`), `/trips`, `/trips/[id]`, `/new-trip` should redirect to `/login` if `!user && !loading`

### Swagger reference
- POST /api/auth/register → UserRegisterInput → 201 UserProfile
- POST /api/auth/login → UserLoginInput → 200 { token }
- GET /api/users/me → 200 UserProfile (Bearer required)
- PUT /api/users/me → UserUpdateInput → 200 UserProfile (Bearer required)

## Constraints
- CSS Modules only — no Tailwind, no inline styles
- JWT stored in localStorage (not a cookie) for simplicity
- Passwords never returned in any API response — strip `password` field before returning
- Use `bcryptjs` not `bcrypt` (no native bindings needed)

## Out of scope
- OAuth / social login
- Password reset / email verification
- Role-based access control (all users have the same permissions)
- Profile avatar image upload (only `avatarUrl` string update)

---

## Design Brief

### Overall layout — both `/login` and `/register`

**Page shell**
- `min-height: 100dvh`
- Background: `var(--hero-gradient)` (`linear-gradient(135deg, #f0f9ff 0%, #ffffff 60%)`) — same sky-wash feel as the dashboard hero
- Display: `flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px`

**Auth card** (the white box holding the form)
- `background: var(--color-surface)`
- `border-radius: var(--radius-xl)` (24 px)
- `box-shadow: var(--shadow-xl)`
- `width: 100%; max-width: 440px`
- `padding: 40px 36px` on desktop; `padding: 32px 24px` below 480px
- Subtle border: `border: 1px solid var(--color-border-subtle)`

**Card header** (inside card, above form)
- Logo row: Lucide `Plane` icon (20 px, `var(--color-primary)`) + "TripPlanner" wordmark (`font-family: var(--font-plus-jakarta-sans); font-size: 18px; font-weight: 700; color: var(--color-text-primary)`) — centered, `margin-bottom: 28px`
- Page title `<h1>`: "Welcome back" (login) / "Create your account" (register); `font-family: var(--font-plus-jakarta-sans); font-size: 24px; font-weight: 700; color: var(--color-text-primary); text-align: center; margin-bottom: 6px`
- Subtitle `<p>`: "Sign in to plan your next adventure" / "Start planning your perfect trips"; `font-size: 14px; color: var(--color-text-secondary); text-align: center; margin-bottom: 28px`

---

### Form fields — shared style (mirrors `NewTripClient`)

**Field wrapper**: `display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px`

**Label**: `font-size: 14px; font-weight: 500; color: var(--color-text-secondary); display: flex; align-items: center; gap: 6px`
- Lucide icon (14 px) prefix per field: Name → `User`, Email → `Mail`, Password → `Lock`

**Input**:
```
height: 44px; padding: 0 12px
border: 1px solid var(--color-border); border-radius: var(--radius-md)
background: var(--color-surface); font-size: 14px; color: var(--color-text-primary)
width: 100%; font-family: inherit
transition: border-color 150ms ease-out, box-shadow 150ms ease-out
```
Focus: `border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); outline: none`
Error state: `border-color: var(--color-error)`; focus-error shadow: `box-shadow: 0 0 0 3px rgba(239,68,68,0.15)`

**Password field** — `position: relative` wrapper, `padding-right: 44px` on input
- Toggle button: `position: absolute; right: 0; top: 0; bottom: 0; width: 44px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: var(--color-text-tertiary)`
- Icon: Lucide `Eye` / `EyeOff` 16 px; `aria-label="Show password"` / `"Hide password"`
- Hover: icon color → `var(--color-text-secondary)`

**Inline field error** (appears on blur when invalid):
`display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--color-error); margin-top: 2px`
Lucide `AlertCircle` 12 px inline prefix. `role="alert"`

---

### API error banner (server error: wrong password, email taken)

Above the first field:
```
display: flex; align-items: center; gap: 8px
padding: 12px 16px; border-radius: var(--radius-md)
background: #fef2f2; border: 1px solid #fecaca; color: var(--color-error)
font-size: 14px; font-weight: 500; margin-bottom: 20px
```
Lucide `AlertCircle` 16 px.

---

### Submit button

Full-width, below all fields:
```
width: 100%; height: 48px; margin-top: 8px; border-radius: var(--radius-md)
background: var(--color-primary); color: var(--color-text-inverse)
font-size: 15px; font-weight: 600; border: none; cursor: pointer
display: flex; align-items: center; justify-content: center; gap: 8px
transition: background 150ms ease-out, transform 150ms ease-out
```
- Default icon: Lucide `LogIn` 18 px (login) / `UserPlus` 18 px (register)
- Loading: `Loader2` 18 px spinning + "Signing in…" / "Creating account…"; button `disabled`; `opacity: 0.85`
- Hover: `background: var(--color-primary-dark); transform: scale(1.01)`
- Disabled: `opacity: 0.6; cursor: not-allowed; transform: none`

---

### Switch link (below button)

`text-align: center; margin-top: 20px; font-size: 14px; color: var(--color-text-secondary)`
Inline `<Link>`: `color: var(--color-primary); font-weight: 600; text-decoration: none`; hover: `text-decoration: underline`

- Login: "Don't have an account? **Sign up**"
- Register: "Already have an account? **Sign in**"

---

### Navbar — logged-in vs logged-out

**Logged-in** (dynamic):
- Avatar circle: `user.name[0].toUpperCase()` — same `.avatar` gradient CSS as today
- Avatar click opens a dropdown card: `position: absolute; top: 44px; right: 0; min-width: 180px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); border: 1px solid var(--color-border); background: var(--color-surface); padding: 8px; z-index: 150`
  - Header row: user name + email; `padding: 8px 12px; border-bottom: 1px solid var(--color-border-subtle); font-size: 13px; color: var(--color-text-secondary)`
  - Log out button: full-width, `padding: 10px 12px; border: none; background: none; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: var(--color-error); border-radius: var(--radius-md)`; Lucide `LogOut` 15 px; hover: `background: var(--color-bg-subtle)`

**Logged-out** (no user):
- Hide avatar entirely
- Show `<Link href="/login">` as ghost button: `height: 40px; padding: 0 16px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 14px; font-weight: 600; color: var(--color-text-secondary); background: transparent; display: inline-flex; align-items: center; gap: 6px; text-decoration: none`; Lucide `LogIn` 15 px
- Mobile menu: same "Log in" entry replacing the avatar

---

### Route guard component

`RouteGuard.tsx` wraps protected pages. While `loading === true`, render full-page spinner:
`min-height: 100dvh; display: flex; align-items: center; justify-content: center`
Lucide `Loader2` 32 px, `color: var(--color-primary)`, `animation: spin 1s linear infinite`.
When `loading === false && !user` → `router.replace('/login')`.

---

### File map

```
src/
  app/
    login/
      page.tsx               ← metadata export + <LoginClient />
      LoginClient.tsx        ← "use client" form
      LoginClient.module.css
    register/
      page.tsx               ← metadata export + <RegisterClient />
      RegisterClient.tsx     ← "use client" form
      RegisterClient.module.css
  components/
    RouteGuard/
      RouteGuard.tsx         ← "use client" wrapper
      RouteGuard.module.css
  contexts/
    AuthContext.tsx
  lib/
    auth.ts                  ← getUserFromRequest helper
  models/
    User.ts                  ← Mongoose User model
```

---

### Accessibility
- All inputs: `<label htmlFor>`, `aria-required="true"`
- Password toggle: `aria-label` changes with state
- Errors: `role="alert"` / `aria-live="polite"`
- Submit: `aria-disabled` when form is invalid
- On failed submit: auto-focus first invalid field
- Dropdown closes on Escape and click-outside (`useEffect` + document listener)

## Completion Summary
Full JWT authentication layer shipped and confirmed by the user on 2026-06-29. Includes Mongoose User model, bcrypt password hashing, three API routes (register, login, me), AuthContext with localStorage persistence, RouteGuard for all protected routes, /login and /register pages matching the Design Brief, and an auth-aware Navbar with avatar dropdown and mobile logout. The dashboard greeting now shows the logged-in user's name.

## Implementation Notes
- Files created: `src/models/User.ts`, `src/lib/auth.ts`, `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/users/me/route.ts`, `src/contexts/AuthContext.tsx`, `src/components/RouteGuard/RouteGuard.tsx`, `src/components/RouteGuard/RouteGuard.module.css`, `src/app/login/page.tsx`, `src/app/login/LoginClient.tsx`, `src/app/login/LoginClient.module.css`, `src/app/register/page.tsx`, `src/app/register/RegisterClient.tsx`, `src/app/register/RegisterClient.module.css`
- Files modified: `.env.local` (JWT_SECRET), `src/app/Providers.tsx` (AuthProvider), `src/components/Navbar/Navbar.tsx` (auth-aware), `src/components/Navbar/Navbar.module.css` (dropdown + loginBtn + mobileLogoutBtn), `src/app/page.tsx` (RouteGuard + useAuth greeting), `src/app/trips/page.tsx` (RouteGuard), `src/app/trips/[id]/page.tsx` (RouteGuard), `src/app/new-trip/page.tsx` (RouteGuard), `src/components/index.ts` (RouteGuard export)
- Deviations from brief: `page.tsx` (dashboard) was converted to a `"use client"` component (with an inner `HomeContent` component using `useAuth`) to read the logged-in user's name for the greeting — this was necessary since Server Components cannot use React context. The `avatarWrapper` is hidden below 768px (same as existing `newTripBtn`) so the desktop dropdown is desktop-only; mobile users access logout via the hamburger menu.
- New design tokens used: none — all values from existing token set
