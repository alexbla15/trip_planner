# Goal: Full API & Data Wiring

Status: done

Replace all mock data with real MongoDB-backed API routes (Next.js Route Handlers + Mongoose), and add JWT authentication, as defined in `swagger.yaml`.

## Tasks
- [x] .claude/tasks/auth-api-and-pages.done.md
- [x] .claude/tasks/trips-api-and-wiring.done.md
- [x] .claude/tasks/attractions-api-and-wiring.done.md
- [x] .claude/tasks/analytics-api.done.md

## Plan
1. **auth-api-and-pages** — must come first; creates the JWT middleware and AuthContext that every subsequent route and page depends on. Also installs bcryptjs + jsonwebtoken.
2. **trips-api-and-wiring** — depends on auth (ownerId from JWT). Replaces all mockTrips usage across dashboard, /trips, /trips/[id], and the new-trip form.
3. **attractions-api-and-wiring** — depends on trips (attractions are nested under trips). Wires the trip-detail page to load and manage real attractions.
4. **analytics-api** — depends on having real trips + attractions data in MongoDB. Backend-only endpoints; no new UI surfaces.
