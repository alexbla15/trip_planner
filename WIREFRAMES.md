# TripPlanner — Wireframes

ASCII layouts for every major screen (`src/app/**`), annotated with the real component
names that render them. See [`DESIGN.md`](./DESIGN.md) for the visual language and
[`FLOWS.md`](./FLOWS.md) for how a user moves between these screens.

Shared chrome on every screen except `/login`/`/register`: a 64px sticky **Navbar**
(logo, `Explore` / `My Trips` nav links, `New Trip` button, avatar menu) — see
`docs/DESIGN_SYSTEM.md`.

---

## Home (`/`, `HomeClient.tsx`)

```
┌──────────────────────────────────────────────────────────┐
│ Navbar: [✈ TripPlanner]   Explore  My Trips   [+New Trip] [👤]│
├──────────────────────────────────────────────────────────┤
│  Hero: headline + subcopy + [Start planning] CTA          │
├──────────────────────────────────────────────────────────┤
│  My Trips  ................................ [See all →]  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  ← Carousel  │
│  │ + New  │ │ Trip A │ │ Trip B │ │ Trip C │  (no wrap,   │
│  │  Trip  │ │ cover  │ │ cover  │ │ cover  │  horiz-scroll│
│  └────────┘ └────────┘ └────────┘ └────────┘  + snap)     │
├──────────────────────────────────────────────────────────┤
│  Explore public trips  .................... [See all →]  │
│  ┌────────┐ ┌────────┐ ┌────────┐   ← 3-col grid (≥1024px)│
│  │ user @ │ │ user @ │ │ user @ │      2-col tablet        │
│  │ avatar │ │ avatar │ │ avatar │      1-col mobile         │
│  └────────┘ └────────┘ └────────┘                          │
└──────────────────────────────────────────────────────────┘
```

## Login / Register (`/login`, `/register`)

```
┌──────────────────────────────┐
│         ✈ TripPlanner         │
│                                │
│   [ Email                  ]  │
│   [ Password               ]  │
│   ( [ Name ] on register only)│
│                                │
│   [        Log in         ]  │
│   inline error banner if any  │
│                                │
│   Don't have an account? →    │
└──────────────────────────────┘
```
Centered single-column card, no navbar. `LoginClient.tsx` / `RegisterClient.tsx` — both
show a visible error banner on failure (not a silent console error) and a loading state on
the submit button.

## My Trips (`/trips`, `TripsClient.tsx`)

```
┌──────────────────────────────────────────────────────────┐
│ Navbar                                                    │
├──────────────────────────────────────────────────────────┤
│  My Trips                                    [+ New Trip] │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐             │
│  │ cover image│ │ cover image│ │ cover image│  grid, wraps │
│  │ Trip name  │ │ Trip name  │ │ Trip name  │  normally    │
│  │ dates      │ │ dates      │ │ dates      │              │
│  │ [mood][mood│ │ [mood]     │ │ [mood][mood│              │
│  └────────────┘ └────────────┘ └────────────┘             │
└──────────────────────────────────────────────────────────┘
```

## New Trip (`/new-trip`, `NewTripClient.tsx`)

```
┌──────────────────────────────────────────┐
│  Plan a new trip                          │
│  [ Trip name                           ]  │
│  [ Country ]        [ Cities (chips)   ]  │
│  [ Start date ]     [ End date         ]  │
│  [ Budget ]  [ Currency ▾ ]               │
│  Moods: [Hidden Gems][Adventure][...]     │
│  Cover image: [ URL / picker ]            │
│  ( ) Private   ( ) Public                 │
│  [        Create trip        ]            │
└──────────────────────────────────────────┘
```

## Trip Detail (`/trips/[id]`, `TripDetailClient.tsx`)

Tab bar (`TripTabBar`) drives four panels — the URL's `?tab=` query param tracks the active
one, so a tab can be deep-linked/shared:

```
┌──────────────────────────────────────────────────────────┐
│ Navbar                                                    │
├──────────────────────────────────────────────────────────┤
│  ← Trip name · country · dates            [Share] [Edit]  │
│  [Overview] [Attractions] [Flights] [Residences]  ← tabs  │
├──────────────────────────────────────────────────────────┤
│  Overview tab:                                             │
│  ┌───────────────────────┐ ┌────────────────────────────┐ │
│  │ Budget summary widget │ │ CalendarSection             │ │
│  │ Map widget (Leaflet)  │ │  Mon 12 │ Tue 13 │ Wed 14   │ │
│  │                       │ │  ▓▓▓▓▓  │  ▓▓▓   │ ▓▓▓▓▓▓  │ │
│  │                       │ │ (auto-fit day window,        │ │
│  │                       │ │  overnight blocks span days) │ │
│  └───────────────────────┘ └────────────────────────────┘ │
│                                                              │
│  Attractions / Flights / Residences tabs: card list of      │
│  linked items + [+ Add] buttons opening the matching modal  │
│  (AttractionSearchModal / AddFlightModal / AddResidenceModal│
│   / AddCustomSlotModal / AddFreeSlotModal)                  │
└──────────────────────────────────────────────────────────┘
```

## Edit Trip (`/trips/[id]/edit`, `EditTripClient.tsx`)

Same field layout as New Trip, pre-filled, plus a collaborator management panel
(`TripSharingPanel`): list of current collaborators with remove buttons, and an
"invite by email" input.

## Explore (`/explore`, `ExploreClient.tsx`)

```
┌──────────────────────────────────────────────────────────┐
│ Navbar                                                    │
├──────────────────────────────────────────────────────────┤
│  Explore                                                   │
│  [World map — click a country/city to filter]  ← Leaflet   │
│  Filter chips: [Hidden Gems] [Adventure] [...]              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ image       │ │ image       │ │ image       │  3/2/1-col │
│  │ 👤 user      │ │ 👤 user      │ │ 👤 user      │  grid      │
│  │ [mood chip] │ │ [mood chip] │ │ [mood chip] │              │
│  └────────────┘ └────────────┘ └────────────┘              │
└──────────────────────────────────────────────────────────┘
```
No free-text search input — discovery is map/chip driven (confirmed: no debounce needed
here, unlike the attraction search modal).

## Profile (`/profile`, `ProfileClient.tsx`)

```
┌──────────────────────────────────────────┐
│  [avatar]  Name                           │
│            email                          │
│  [ Name field        ] [Save]             │
│  [ Avatar picker      ]                   │
│  Change password:                         │
│  [ current ] [ new ] [Save]               │
└──────────────────────────────────────────┘
```

## Analytics (`/analytics`, `AnalyticsClient.tsx`)

```
┌──────────────────────────────────────────────────────────┐
│  Analytics                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Trip count  │ │ Category    │ │ Mood         │          │
│  │ stat tile   │ │ donut chart │ │ breakdown    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  Global vs. personal toggle                                │
└──────────────────────────────────────────────────────────┘
```

## Admin (`/admin`, `AdminClient.tsx` — `role: "admin"` only)

```
┌──────────────────────────────────────────────────────────┐
│  Admin                                                     │
│  ▾ Attraction Categories        [+ Add]     ← Collapsible  │
│    name | icon | color | [edit] [delete]      SectionCard  │
│  ▾ Attraction Types              [+ Add]                   │
│    name | category | icon | [edit] [delete]                │
│  ▾ Mood Tags                     [+ Add]                   │
│    name | colors preview | [edit] [delete]                 │
└──────────────────────────────────────────────────────────┘
```
Non-admin users are redirected away (client-side `role !== "admin"` check).

## API Docs (`/api-docs`)

Full-page embedded Swagger UI (`swagger-ui-react`, loaded client-only via `next/dynamic`),
served from the live, corrected `swagger.yaml` via `GET /api/openapi`.
