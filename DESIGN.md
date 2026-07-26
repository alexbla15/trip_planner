# TripPlanner — Design

This is a curated summary of the full design system already documented in
[`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) (the canonical reference — read that file
for exact token values and component specs). This document adds the *why* behind the key
choices and an honest note on where implementation hasn't fully caught up to the spec.

## Philosophy

"Minimalism with atmospheric depth" — the product's core pitch (see [`idea.md`](./idea.md))
is that travelers should *feel* a destination before they plan it, so the UI gets out of the
way of destination photography: generous whitespace, few competing colors, information
revealed progressively (collapsible sections, modals) rather than dumped into dense lists.

**Why CSS Modules over Tailwind/a component library:** the codebase is small enough that a
utility-class framework wouldn't buy much, and scoped `.module.css` files keep component
styling colocated and reviewable without a build-time class-name convention to learn.

## Color

Primary palette is sky blue (`#0284C7`, "open skies, oceans") with amber accent (`#D97706`,
"golden hour warmth") — a direct visual metaphor for travel, not an arbitrary brand color.
All text/background pairs are chosen to clear WCAG AA (4.5:1) contrast; see the token table
in `docs/DESIGN_SYSTEM.md` for exact values. Seven mood tags (Hidden Gems, Instagrammable,
Vibrant Nightlife, Cultural Heritage, Adventure, Beach Life, Food & Wine) each get a fixed
background/text pair so the same mood always reads the same way across the app, reinforcing
the "vibe-first" browsing model described in the PRD.

## Typography

Two-font pairing: **Plus Jakarta Sans** (headings — geometric, a bit more "premium/app-like")
and **Inter** (body — neutral, maximizes readability at small sizes for dense trip details).
An 8-step type scale (12px–36px) covers everything from captions to hero headings without
ad hoc sizes creeping into components.

## Spacing & shape

A strict 4px base unit for spacing avoids the "almost-aligned" look that creeps in when
components pick arbitrary padding. Border radius scales from 6px (chips) to 24px (hero
panels) — larger surfaces get proportionally softer corners, which reads as "calmer" than a
single radius reused everywhere.

## Component patterns worth calling out

- **Carousel** (`src/components/Carousel/`) — "My Trips" never wraps to a second row, at any
  breakpoint; it's a horizontal scroll-snap container instead. This was a deliberate choice
  to keep the dashboard's most important row scannable in one glance rather than pushing
  content below the fold on mobile.
- **Collapsible section** (`src/components/SectionCard/`) — used for dense admin/data
  sections; always defaults to expanded (`defaultOpen: true`) so collapsing is opt-in
  decluttering, never a surprise-hidden default that hides content from a first-time user.
- **Trip Card / New Trip CTA** share identical dimensions so the dashboard grid never
  jumps when a trip is added — the CTA card is a placeholder in the same visual slot.

## Icons

Lucide React exclusively (stroke-based, 2px weight) — explicitly *not* emoji, even though
mood tags are an inherently "fun" feature where emoji would be tempting; keeping icon
weight/style consistent across functional and decorative icons was judged more important
than the extra personality emoji would add.

## Responsive design — honest status

`docs/DESIGN_SYSTEM.md` defines a standard mobile-first breakpoint set (640/768/1024/1280px).
In the actual CSS Modules, responsiveness is implemented **per-component** rather than via
shared breakpoint tokens or mixins — 24+ `.module.css` files each declare their own
`@media` queries at roughly (but not exactly) those breakpoints. This works — every major
screen has been checked for mobile/desktop layouts and none rely on a fixed pixel width that
breaks on a small viewport — but it's a known inconsistency rather than a strictly enforced
system: a shared `breakpoints.css` (custom-media or a small set of exported constants) would
be the natural next step if more screens get added, but rewriting 24 existing files to adopt
it wasn't judged worth the churn for this pass.

## Anti-patterns (kept from the source doc, still enforced)

No emoji as structural icons, no dense unbroken lists, no raw hex values inside component
CSS (always the custom-property tokens), no fixed pixel container widths, no hover-only
interactions (everything must also work on touch), no gray-on-gray text below the 4.5:1
contrast floor.
