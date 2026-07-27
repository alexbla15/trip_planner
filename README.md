# TripPlanner

A full-stack trip-planning app: travelers build day-by-day itineraries from a shared,
crowdsourced attraction database, schedule them on a per-day calendar (including flights,
accommodation stays, and free-form time slots), track a multi-currency budget, and
collaborate on a trip with other users.

**Live app:** https://trip-planner-beta-dusky.vercel.app/
**API docs:** [`/api-docs`](https://trip-planner-beta-dusky.vercel.app/api-docs) (Swagger UI) — see also [`swagger.yaml`](./swagger.yaml)

See also: [`SPEC.md`](./SPEC.md) (system spec, ERD, full endpoint table), [`PRD.md`](./PRD.md)
(product requirements), [`DESIGN.md`](./DESIGN.md), [`FLOWS.md`](./FLOWS.md),
[`WIREFRAMES.md`](./WIREFRAMES.md), [`PRESENTATION.md`](./PRESENTATION.md).

---

## What it does

TripPlanner is built around one idea: attractions are **global, shared, crowdsourced
objects** (name, location, category, "mood" tags), while **trips are where an attraction
gets a schedule** (planned date/time, duration, and — for residences — trip-specific stay
dates and price). The same museum can be linked into many different users' trips without
duplicating its data; only the per-trip scheduling is trip-specific.

Core features:
- **Trip management** — create/edit/delete trips (destination, dates, budget/currency,
  cover image, "mood" tags, privacy), with owner + collaborator access control.
- **Attraction discovery** — search/browse a shared attraction database by country, city,
  or category; add existing attractions to a trip or create new ones inline.
- **Calendar scheduling** — a day-by-day calendar view (`CalendarSection`) that places
  attractions, flights, and free-form time slots on a timeline, including overnight-spanning
  blocks (e.g. a hotel stay or overnight flight) and an auto-fit day window.
- **Flights & residences as trip-scoped schedule entries** — flights and ad-hoc "free time"
  slots exist only inside a trip's schedule (no shared document); residences keep only
  reusable place data (name, location, type) on the shared `Attraction` document, while
  stay dates/price/notes live on the trip's schedule entry so the same residence can be
  reused across trips with different dates each time.
- **Collaboration** — trip owners invite collaborators by email; collaborators can view/edit
  the itinerary, only the owner can manage collaborators or delete the trip.
- **Explore** — browse public trips other users have shared, for inspiration.
- **Analytics** — personal and global stats (attraction category distribution, mood
  breakdown, etc.) on the `/analytics` page.
- **Admin** — manage the shared taxonomy (attraction types, categories, mood tags) at `/admin`,
  restricted to users with `role: "admin"`.

## How it's built

Next.js 16 (App Router) serves as **both frontend and backend** — there is no separate
Node server. Pages under `src/app/**` are the frontend; route handlers under
`src/app/api/**` are the REST API, backed by MongoDB via Mongoose. See
[`PRESENTATION.md`](./PRESENTATION.md) for the full architecture writeup.

- **Frontend:** React 19, CSS Modules (no Tailwind/component library — see
  [`DESIGN.md`](./DESIGN.md)), Context API for auth/attraction-taxonomy state, Leaflet for
  maps.
- **Backend:** Next.js Route Handlers, organized by domain
  (`api/trips`, `api/attractions`, `api/auth`, `api/users`, `api/attraction-types`,
  `api/attraction-categories`, `api/mood-tags`, `api/analytics`, `api/explore`, plus
  `api/geo` and `api/route` proxies for map boundary/routing lookups). Business logic for
  the two largest domains (trips, attractions) lives in `src/lib/services/`; every route is
  wrapped in a shared error-handling/logging/CORS layer (`src/lib/withApiHandler.ts`).
- **Database:** MongoDB via Mongoose (`src/models/*.ts`). See [`SPEC.md`](./SPEC.md) for the
  full ERD.
- **Auth:** JWT (`jsonwebtoken`) + bcrypt-hashed passwords (`bcryptjs`). Sessions are a
  7-day JWT in `Authorization: Bearer <token>`; there is no server-side session store.

## Maps & routing

Map features are built from four external services, proxied through Next.js API routes
(`api/geo/*`, `api/route/*`) to avoid CORS and to attach required headers (e.g. a custom
`User-Agent`, which these free public instances require):

- **Leaflet** — client-side map rendering only. It doesn't fetch data itself; it draws
  whatever the services below hand it (polylines, boundary polygons).
- **OpenStreetMap / Nominatim** — geocoding and place boundaries. Given a place name,
  returns its shape as GeoJSON (Polygon/MultiPolygon), used to draw city/country outlines.
  Proxied via `GET /api/geo/city` and `GET /api/geo/country`
  (`src/app/api/geo/{city,country}/route.ts`).
- **Valhalla** — walking/driving routing between two points. Proxied via
  `GET /api/route/valhalla` (`src/app/api/route/valhalla/route.ts`), which actually calls
  OSRM instances at `routing.openstreetmap.de` (the public Valhalla demo is unreliable).
  Returns turn-by-turn geometry and duration.
- **Transitous** — public transit routing (bus/rail/tram/etc.), an OTP2/MOTIS instance.
  Proxied via `GET /api/route/transit` (`src/app/api/route/transit/route.ts`). Returns
  itineraries with per-leg transit lines and encoded polylines; falls back to Valhalla
  walk, then car, when no transit route is available.

Client-side consumers: `src/services/geo.service.ts` (boundaries) and
`src/services/routeTransit.service.ts` (point-to-point routing, exposing `fetchRouteLeg`
and `fetchAirportLeg`).

## Data model (short version)

```
User 1──N Trip (owner)         Trip N──N User (collaborators)
Trip N──N Attraction (attractionIds, shared/global entity)
Trip 1──N ScheduleEntry (Trip.schedules — keyed by attractionId, or a synthetic
                          "cs-*"/"fl-*" id for schedule-only custom-slots/flights)
Attraction N──N AttractionType ──1 AttractionCategory
```

Full field-level ERD: [`SPEC.md`](./SPEC.md#erd).

## Getting started

### Prerequisites
- Node.js 20+
- A MongoDB connection string (Atlas or self-hosted)

### Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Open http://localhost:3000.

### Environment variables

See [`.env.example`](./.env.example) — the app reads exactly these:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string. Read at import time by `src/lib/mongoose.ts` — the app throws on startup if missing. |
| `JWT_SECRET` | Yes | Secret used to sign/verify session JWTs (`src/lib/auth.ts`). |
| `ALLOWED_ORIGINS` | No | Comma-separated extra origins allowed to call the API cross-origin (`src/lib/cors.ts`). Empty = same-origin only (the default; the app serves its own frontend and API). |

### Seeding the shared taxonomy

Attraction categories, attraction types, and mood tags are shared reference data (used to
tag attractions and trips). Two admin-only endpoints seed sensible defaults on a fresh
database — call them once, authenticated as an admin user:

- `POST /api/mood-tags/seed`
- `POST /api/attraction-categories/seed-from-types`

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |

## Deployment

- **Frontend + API (current):** [Vercel](https://trip-planner-beta-dusky.vercel.app/) —
  zero-config for this app (Next.js is Vercel's native target); just set `MONGODB_URI` and
  `JWT_SECRET` as project environment variables.
- **Alternative (container-based):** a [`Dockerfile`](./Dockerfile) and
  [`render.yaml`](./render.yaml) are included for deploying to Render/Railway/Fly.io instead.
  `next.config.ts` sets `output: "standalone"` to keep the Docker image minimal.

## API documentation

Full OpenAPI 3.0 spec: [`swagger.yaml`](./swagger.yaml), served live at
[`/api-docs`](https://trip-planner-beta-dusky.vercel.app/api-docs) via Swagger UI
(`src/app/api-docs/`, backed by `GET /api/openapi`). See [`SPEC.md`](./SPEC.md#endpoints)
for a condensed endpoint table.

## Git workflow

Commit history to date is linear on `master` (no feature-branch/PR workflow has been used
yet) — noted here rather than glossed over, since accurate documentation matters more than
a tidy story.
