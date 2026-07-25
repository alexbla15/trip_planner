# Task: Homepage "My Trips" — carousel instead of wrapping grid

Status: done
Track: A
Track reason: no carousel/horizontal-scroll-with-navigation pattern exists anywhere in the codebase today — this is a new UI interaction, not a reuse of an existing one.

## Problem
"My Trips" on the homepage (`src/app/HomeClient.tsx`, `.tripsGrid` in `src/app/page.module.css` lines ~91-127) is a CSS grid that wraps trip cards onto multiple rows on tablet/desktop (1 → 2 → 4 columns as viewport widens). Only on mobile (`<640px`) does it become a horizontally-scrollable single row. The desktop/tablet wrapping grid should instead be a single-row carousel at every breakpoint — cards never wrap to a second row.

No carousel pattern (scroll-snap, arrow-button nav, dot indicators) exists elsewhere in this codebase to copy from — `ExploreSection`'s grid is the same wrap-on-desktop pattern, not a carousel. This needs to be designed, not just reused.

Also noted during investigation: `docs/DESIGN_SYSTEM.md`'s "Dashboard Grid" section already documents "first slot = New Trip CTA" for My Trips, but the current code (`HomeClient.tsx`) appends the `NewTripCard` **last**, after all trip cards — a pre-existing discrepancy. Fix this as part of the redesign (CTA card first) rather than leaving it inconsistent with the design doc.

## Goal
"My Trips" renders as a single horizontal row at every breakpoint (mobile through desktop) — trip cards never wrap onto a second row — with the "New Trip" CTA card as the first item, matching the design system's documented intent.

## Requirements
- Convert `.tripsGrid` from a responsive grid to a horizontal carousel: single row, `overflow-x` scrollable, no wrapping, at all breakpoints (not just mobile).
- Reorder so `NewTripCard` renders first, before the trip cards (fixes the doc/code discrepancy noted above).
- Design and implement the actual carousel interaction — decide (and document in `docs/DESIGN_SYSTEM.md` as a new reusable pattern, since none exists) whether this uses: bare scroll + `scroll-snap-type` only, or scroll + visible prev/next arrow buttons for discoverability on non-touch devices, or both. Whatever is chosen must work with touch/swipe on mobile and be operable without a trackpad/touch surface on desktop (arrow buttons or visible scrollbar, not scroll-only with no affordance).
- Cards keep their existing size/spacing (`TripCard`'s own dimensions are unchanged) — only the container's layout behavior changes.
- Update `docs/DESIGN_SYSTEM.md`'s "Dashboard Grid" section to describe the new carousel behavior (replacing the outdated "4-column card grid... horizontally scrollable on mobile" description) and document it as a reusable pattern under "Component Patterns" if it's built as a generic carousel container other sections could reuse later.

## Constraints
- Do not change `TripCard`'s own visual design, only how the row of cards is laid out/scrolled.
- Do not add fetch-triggering "infinite scroll" logic — `listTrips` already loads the full trip list in one request (`src/services/trips.service.ts`); the carousel only needs to lay out what's already in state, no pagination.
- `Explore`'s card grid (`ExploreSection`) is out of scope — this task is specifically "My Trips" on the homepage.

## Out of scope
- Any change to `Explore`'s grid layout.
- Infinite-scroll/pagination for trip fetching.
- `TripCard`'s internal visual design.

## Design Brief

### New reusable component: `Carousel`
Build `src/components/Carousel/` (own folder, per component structure rules) — a generic horizontal-scroll-with-arrows wrapper any future section can reuse, not something baked into `HomeClient.tsx` directly.

```ts
interface CarouselProps {
  children: ReactNode;
  ariaLabel: string;
}
```

- Renders a scroll container (`<ul role="list">` or a plain `<div>` — pick whichever keeps semantics simplest given `HomeClient.tsx` already wraps items in `<Link>`) with `overflow-x: auto`, `scroll-snap-type: x mandatory`, `-webkit-overflow-scrolling: touch`, hidden scrollbar (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }` — same technique already used in the mobile-only `.tripsGrid` block being replaced).
- Each direct child gets `scroll-snap-align: start; flex: 0 0 280px;` (280px matches `TripCard`'s documented min-width in `docs/DESIGN_SYSTEM.md`, and the existing mobile-only carousel treatment already uses this value — stay consistent). Gap between cards: `24px` (matches the design system's documented "Card gap: 24px").
- Two overlaid arrow buttons (`ChevronLeft`/`ChevronRight`, Lucide, 20px), absolutely positioned at the vertical center of the row, `left: -20px` / `right: -20px` (half-outside the container edge — clip via the section's own padding, or clamp inside if that overflows awkwardly at 24px page padding; use judgment, whichever reads cleaner). Visual style: 40×40px circle, `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `box-shadow: var(--shadow-md)`, `border-radius: var(--radius-full)`; hover: `background: var(--color-primary-light)`, `border-color: var(--color-primary)`. This matches the existing circular icon-button visual language used elsewhere (e.g. `SectionCard`'s `.iconCircle`, sized differently but same token set).
- Clicking an arrow scrolls by one card-width + gap (`container.scrollBy({ left: ±(280 + 24), behavior: "smooth" })`) — or by however many cards are fully visible at the current viewport width if that reads more naturally; developer's call, keep it simple.
- Track scroll position (`onScroll` handler or a `ResizeObserver`/scroll-boundary check) to disable/hide the prev button at the start and the next button at the end — don't leave a dead-end arrow that does nothing when clicked.
- Touch/trackpad swipe already works for free via native `overflow-x: auto` + `scroll-snap-type` — no extra JS needed for that part.
- Respect `prefers-reduced-motion`: use `scroll-behavior: auto` instead of `smooth` (or skip the `behavior: "smooth"` JS option) when reduced motion is requested.

### Applying it
- `HomeClient.tsx`: wrap the "My Trips" `.tripsGrid` contents in `<Carousel ariaLabel="Your trips">`, and move `<NewTripCard />` to render **first**, before the `trips.map(...)` block (fixes the doc/code discrepancy).
- `page.module.css`: remove the `.tripsGrid` grid/media-query rules being replaced by the new `Carousel` component's own module CSS; keep `.cardLink` as-is (still needed inside carousel items).

### Design system update
Replace `docs/DESIGN_SYSTEM.md`'s "Dashboard Grid" bullet for My Trips (currently "Desktop (≥1024px): 4-column card grid for My Trips... horizontally scrollable on mobile for My Trips") with a description of the carousel behavior at all breakpoints, and add a new "Carousel" entry under "Component Patterns" documenting: 280px card width, 24px gap, scroll-snap + arrow-button pattern, arrow button visual spec, and the boundary-disable behavior — so the next section that needs a horizontal row (not just My Trips) can reuse it without re-deriving the spec.

## Implementation Notes
- Files created/modified:
  - `src/components/Carousel/` (new: `Carousel.tsx`, `Carousel.module.css`, `Carousel.utils.ts`, `Carousel.types.ts`, `index.ts`) — generic horizontal-scroll-with-arrows wrapper per the brief. Card width comes purely from CSS (`flex: 0 0 280px` on direct children) — no `cardWidth` prop, since both `TripCard`/`NewTripCard` and (after the mid-flow extension below) `ExploreCard` all already render at `width: 100%` with no self-imposed width, so a single shared 280px works for both without needing to be configurable.
  - `src/app/HomeClient.tsx` — wraps My Trips content in `<Carousel ariaLabel="Your trips">`; `NewTripCard` now renders first (fixes the doc/code discrepancy).
  - `src/app/page.module.css` — removed the old `.tripsGrid` grid + mobile-only-scroll rules (fully superseded by `Carousel`'s own CSS); kept `.cardLink`.
  - `src/components/index.ts` — barrel export for `Carousel`.
  - `docs/DESIGN_SYSTEM.md` — updated per the brief (already applied before handoff).
- **Mid-flow scope addition (user request, not in the original brief):** "same carousel logic for 'Explore the world'" — applied the identical `Carousel` component to `src/components/ExploreSection/ExploreSection.tsx` (the homepage's "Explore the World" preview section, distinct from the standalone `/explore` page which was NOT touched — the user named the section by its heading text, and a dedicated full-browse page reasonably keeps its own wrapping grid). This removed the section's page-based pagination (`PAGE_SIZE = 6`, prev/next page buttons) entirely — a carousel showing 6-at-a-time behind page-flip controls would have been a confusing double-pagination UX, so all `filtered` items now render in one scrollable row, browsed via the `Carousel`'s own arrow/scroll navigation instead. Also cleaned up `ExploreSection.module.css`'s now-dead `.grid`/`.pagination`/`.pageBtn`/`.pageInfo` rules.
- Deviations from brief: none on the core My Trips work. The Explore extension was an explicit user request mid-implementation, not a deviation.
- New design tokens used: none — `Carousel` uses only existing tokens (`--radius-full`, `--shadow-md`, `--color-surface`/`--color-border`/`--color-primary`/`--color-primary-light`, `--duration-fast`, `--easing-out`), matching the Design Brief exactly.

Verification: `tsc --noEmit` clean. `eslint` on all touched/new files clean except one pre-existing unused-import warning in `ExploreSection.tsx` (`Globe`, unused before this change too — confirmed via `git diff`, only `ChevronLeft`/`ChevronRight` were removed from that import line). Full `next build` succeeds, 33 routes build clean. Manually confirmed the homepage returns HTTP 200 against the dev server; full interactive verification (scrolling the carousel, clicking arrows, confirming boundary-disable behavior in a real browser) was not done — no browser-driving tool available in this environment. Recommend a quick manual pass on `/` before considering this fully done.

## Completion Summary
Built a reusable Carousel component (scroll-snap + arrow navigation, boundary-aware) and applied it to homepage "My Trips" (fixing the New Trip CTA card ordering to match the design doc) and, per a mid-flow user request, to the "Explore the World" section as well (replacing its page-based pagination with continuous horizontal scroll). Documented the new pattern in docs/DESIGN_SYSTEM.md for reuse. Confirmed by user 2026-07-25.
