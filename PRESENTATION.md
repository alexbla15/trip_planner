# TripPlanner — Developer Presentation

A one-read handoff doc: what the app does, how it's built, the decisions worth knowing
about, and how to run it. For deeper detail, this links out to the other docs rather than
duplicating them.

## 30-second pitch

TripPlanner is a full-stack trip planner where **attractions are a shared, crowdsourced
database** and **trips are where they get scheduled**. A museum linked into ten different
users' trips is one document, not ten copies — only the per-trip scheduling (date, time,
duration, and for residences, stay dates/price) is trip-specific. That single modeling
decision — shared entity + trip-scoped schedule — is the thing to understand before reading
any of the code.

Live: https://trip-planner-beta-dusky.vercel.app/ · API docs: `/api-docs`

## Architecture at a glance

```
Next.js 16 App Router
├─ src/app/**            Frontend pages (React 19, CSS Modules)
├─ src/app/api/**         REST API — Route Handlers, no separate server
├─ src/lib/
│   ├─ mongoose.ts         Cached DB connection (serverless-safe)
│   ├─ auth.ts             JWT sign/verify — throws ApiError(401) on failure
│   ├─ apiError.ts         ApiError class + status-code factory functions
│   ├─ withApiHandler.ts   Wraps every route: error handling, logging, CORS
│   ├─ cors.ts             Same-origin by default, ALLOWED_ORIGINS to extend
│   ├─ logger.ts           Structured JSON log lines
│   └─ services/           Business logic for Trips & Attractions (the two
│                           complex domains) — routes call these, stay thin
├─ src/models/**          Mongoose schemas (User, Trip, Attraction, ...)
├─ src/contexts/**        AuthContext, AttractionsContext (app-wide state)
├─ src/hooks/**            Reusable hooks (useDebounce, taxonomy caches, ...)
└─ src/components/**      ~30 components (modals, cards, calendar, maps, charts)
```

One process serves both halves — there's no API gateway, no separate deploy target for the
backend. That's a deliberate fit for this app's size, not an oversight; see
[`PRD.md`](./PRD.md#scope-boundaries) for the explicit "no microservice split planned" call.

## Key technical decisions

**Attractions are global; schedules are trip-scoped.** `Attraction` has no `tripId`.
`Trip.schedules` is a `Map<string, ScheduleEntry>` keyed either by a real attraction id
(override for that trip) or a synthetic id (`fl-<objectId>` for flights, `cs-<objectId>` for
free-form time slots — entries that have no backing `Attraction` document at all). This
keeps flights/custom-slots trip-scoped *by construction*: there's no shared document for
them to accidentally leak into another trip's picker. See `src/models/Trip.ts` and
`src/lib/services/attractions.service.ts` for the full mechanics, including the
`toObject({ flattenMaps: true })` technique used to read back fields that Mongoose's cached
sub-schema would otherwise strip.

**Auth is stateless JWT, not sessions.** `POST /api/auth/login` returns a 7-day JWT; every
protected route calls `getUserFromRequest(req)` (`src/lib/auth.ts`), which now throws
`ApiError(401)` directly on a missing/invalid/expired token — no server-side session store,
no `middleware.ts` gate; each route re-checks per-request. This was a deliberate choice to
keep auth checks colocated with the specific access-control logic each route needs (owner
vs. collaborator vs. admin all differ per-route) rather than a blanket gate that would need
per-route exceptions anyway.

**Centralized error handling was retrofitted, not designed in from day one.** Before this
pass, every route hand-rolled its own `try/catch` and status codes — inconsistently: several
routes collapsed *any* failure (including real 500s) into a hardcoded 401. `src/lib/apiError.ts`
+ `src/lib/withApiHandler.ts` fix this: routes now `throw` a typed `ApiError` (or let one
propagate from `getUserFromRequest`/a service function) and a single wrapper produces
consistent `{ error, code }` JSON at the right status, with structured server-side logging
for anything unexpected. This is why every route in `src/app/api/**` now has the same
three-line shape: `export const GET = withApiHandler("GET /api/x", async (req) => {...})`.

**Service-layer extraction was scoped to the two complex domains.** `src/lib/services/`
holds `trips.service.ts` and `attractions.service.ts` — the domains with real business logic
(access control across owner/collaborator, schedule-map manipulation, duplicate-name
handling). Simpler CRUD domains (mood tags, attraction types/categories) were left with
their logic inline in the route handler — extracting a service for a five-line Mongoose
query would add indirection without benefit. See [`PRD.md`](./PRD.md) for the reasoning.

**Residences vs. flights vs. custom slots — three different scoping strategies for a
reason.** A residence is a real place (has a location, gets shown on the map, is worth
reusing "same hotel, different trip"), so it keeps a shared `Attraction` document — but its
stay dates/price are per-trip data, stored only on the schedule entry. A flight has no
reusable "place" at all, so it's schedule-only. A custom slot is explicitly ad hoc ("lunch",
"free time") — also schedule-only. Getting this distinction right (and keeping the
"never write trip-specific data onto the shared document" rule) was flagged as a real,
previously-hit bug class in `docs/LEARNINGS.md` and is now enforced by convention +
comments at every write site.

## What changed in this production-readiness pass

Full detail in [`SPEC.md`](./SPEC.md); summary:
- Consistent error handling/status codes/logging across all 30 API routes
  (`src/lib/withApiHandler.ts`), fixing routes that mislabeled every failure as a 401.
- Service-layer extraction for Trips and Attractions.
- Silent-failure fixes in the trip detail UI (mutation errors now surface visibly instead of
  failing with no feedback) and a debounce hook applied to attraction search.
- Real `skip`/`limit` pagination on the two unbounded list endpoints (`/api/attractions`,
  `/api/explore`), returned via response headers so the response body stays backward
  compatible.
- Deployment config that didn't exist before: `.env.example`, `Dockerfile` +
  `output: "standalone"`, `render.yaml` (Vercel itself needed nothing — it's zero-config for
  this app).
- Live Swagger UI at `/api-docs`, and `swagger.yaml` gaps closed (4 missing routes, a
  path-param naming mismatch).
- This documentation suite.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI, JWT_SECRET
npm run dev                  # http://localhost:3000
```

`npm run build` type-checks and builds; `npm run lint` runs ESLint. See
[`README.md`](./README.md) for environment variables and deployment details.

## Where to look next

- New to the data model? Start with [`SPEC.md`](./SPEC.md#erd).
- Implementing a new feature? Check `docs/LEARNINGS.md` first — it's a dense log of
  non-obvious bugs already hit and fixed in this codebase (Mongoose Map-field quirks,
  populated-ref `.toString()` traps, etc.) — re-reading it before writing Mongoose code in
  this repo will save time.
- Touching the UI? [`DESIGN.md`](./DESIGN.md) and `docs/DESIGN_SYSTEM.md`.
