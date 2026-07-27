# TripPlanner — User Flows

Primary journeys through the app, as Mermaid flowcharts, grounded in the actual routes and
components (see [`WIREFRAMES.md`](./WIREFRAMES.md) for the screens referenced here and
[`SPEC.md`](./SPEC.md) for the endpoints each step calls).

## 1. Onboarding (register → first trip)

```mermaid
flowchart TD
    A[Land on /] --> B[Click 'Start planning' or 'New Trip']
    B --> C{Logged in?}
    C -- No --> D["/register"]
    D --> E[POST /api/auth/register]
    E -- 201 --> F[Redirect to /login with success message]
    E -- 400/409 --> G[Inline error: invalid input / email taken]
    G --> D
    F --> H["/login"]
    H --> I[POST /api/auth/login]
    I -- 200 --> J[Store JWT, AuthContext hydrates]
    I -- 401 --> K[Inline error: invalid credentials]
    K --> H
    C -- Yes --> J
    J --> L["/new-trip"]
    L --> M[POST /api/trips]
    M -- 201 --> N[Redirect to /trips/:id]
    M -- 400 --> O[Inline error: missing/invalid fields]
    O --> L
```

## 2. Core flow: build an itinerary

```mermaid
flowchart TD
    A["/trips/:id — Overview tab"] --> B[Open Attractions tab]
    B --> C[Click + Add]
    C --> D[AttractionSearchModal]
    D --> E[Type query]
    E -- debounced 300ms --> F["GET /api/attractions?country=...&q=..."]
    F --> G{Found existing?}
    G -- Yes --> H[Select it]
    G -- No --> I["PenLine 'Create new' → NewAttractionModal"]
    I --> J["POST /api/trips/:id/attractions (new attraction)"]
    H --> K["POST /api/trips/:id/attractions (existingAttractionId)"]
    J --> L[Attraction now linked + scheduled]
    K --> L
    L --> M[Overview tab → CalendarSection]
    M --> N[Drag/set planned date+time]
    N --> O["PATCH /api/trips/:id/attractions/:attractionId"]
    O -- 200 --> M
    O -- error --> P[Visible error banner — actionError state]
    P --> M
```

## 3. Flights & residences (trip-scoped scheduling)

```mermaid
flowchart TD
    A[Flights tab] --> B[+ Add flight]
    B --> C[AddFlightModal: flight #, airline, times, gate/seat]
    C --> D["POST /api/trips/:id/attractions (subtype: flight)"]
    D --> E[Schedule-only entry created — no Attraction document,\nsynthetic id fl-*]
    E --> A

    F[Residences tab] --> G[+ Add residence]
    G --> H{"Pick existing residence\nfrom another trip, or create new?"}
    H -- Existing --> I[AttractionPickerModal — filtered to subtype=residence]
    H -- New --> J[AddResidenceModal: name, location, type]
    I --> K["POST /api/trips/:id/attractions\n(existingAttractionId + this trip's checkInDate/checkOutDate/price)"]
    J --> K
    K --> L["Shared Attraction doc keeps only reusable place data;\nstay dates/price/notes saved to THIS trip's schedule entry"]
    L --> F
```

## 4. Collaboration

```mermaid
flowchart TD
    A["/trips/:id/edit — TripSharingPanel"] --> B[Enter collaborator email]
    B --> C["POST /api/trips/:id/collaborators"]
    C -- 201 --> D[Collaborator added, visible in list]
    C -- 400 --> E["Inline error: self-invite / missing email"]
    C -- 404 --> F["Inline error: no account with that email"]
    C -- 409 --> G["Inline error: already a collaborator"]
    E --> A
    F --> A
    G --> A
    D --> H[Collaborator logs in]
    H --> I["GET /api/trips — trip appears\n(owner OR collaborator match)"]
    I --> J[Collaborator opens trip, edits itinerary]
    J --> K{"Owner-only action?\n(delete trip / manage collaborators)"}
    K -- Yes --> L[403 Forbidden — action hidden/blocked in UI]
    K -- No --> M["Edit succeeds like the owner's"]
```

## 5. Explore → public trip inspiration

```mermaid
flowchart TD
    A["/explore"] --> B["GET /api/explore — public trips w/ cover image"]
    B --> C[Browse map / filter chips]
    C --> D[Click a trip card]
    D --> E["GET /api/trips/:id — no auth required (isPrivate: false)"]
    E --> F[Read-only trip view]
```

## 6. Error recovery (cross-cutting)

```mermaid
flowchart TD
    A[Any mutation: create/update/delete] --> B[withApiHandler catches the error]
    B --> C{ApiError?}
    C -- Yes --> D["Known status (400/401/403/404/409) +\nconsistent {error, code} JSON"]
    C -- No --> E["Unexpected error — logged server-side (src/lib/logger.ts),\nclient sees generic 500, no internals leaked"]
    D --> F["Client catch block sets visible error state\n(no silent catch block — see TripDetailClient's actionError pattern)"]
    E --> F
    F --> G[User sees inline error banner, can retry]
    G --> A
```

## 7. Admin taxonomy management

```mermaid
flowchart TD
    A["/admin"] --> B{"role === 'admin'?"}
    B -- No --> C[Redirected away]
    B -- Yes --> D[Manage Categories / Types / Mood Tags]
    D --> E[+ Add / Edit / Delete]
    E --> F["POST/PUT/DELETE /api/attraction-* or /api/mood-tags"]
    F -- 403 --> G[Non-admin token rejected server-side too\n— not just a client-side gate]
    F -- 200/201 --> H[List updates in place]
```
