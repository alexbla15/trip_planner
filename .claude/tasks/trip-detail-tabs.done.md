# Task: Trip Detail Page Tab Navigation

Status: done

Track: A
Track reason: New navigation surface on an existing page — tabbed or equivalent layout with no existing pattern in the design system

## Problem
The `trips/[id]` page stacks all content vertically (overview, flights, residences, expenses, attractions), making it long and difficult to scan. Users have to scroll through everything to reach a specific section. There is no quick way to jump between content types, and the page feels dense and unstructured.

## Goal
The trip detail page is reorganised into clearly separated, easy-to-switch sections — Overview, Flights, Residences, Expenses, and Attractions — so users can navigate directly to what they need without scrolling.

## Requirements
- The page must present five distinct sections: **Overview**, **Flights**, **Residences**, **Expenses**, **Attractions**
- Navigation between sections must be immediate (no page load) — client-side switching only
- The active section indicator must be visually clear
- Each section renders only its own content — no duplication
- Responsive: works well on mobile (narrow screens) and desktop
- The navigation pattern should feel polished and intentional — tabs are the default suggestion, but the designer may propose an alternative if it fits the travel/trip aesthetic better
- Preserve URL-friendliness where possible (e.g. `?tab=flights` hash or query param so sharing a link lands on the right section)

## Constraints
- CSS Modules only — no Tailwind, no inline styles
- Existing content components (CalendarSection, FlightsList, ResidencesList, ExpensesPanel, etc.) must be reused inside each tab panel — do not rewrite them
- `TripDetailClient.tsx` is the entry point for this page; changes are scoped there and any new tab-shell component

## Out of scope
- Rewriting or redesigning any individual section's content (that's separate tasks)
- Adding new data to any section
- Animated page transitions between sections (keep simple for now)

---

## Design Brief

### Pattern decision

**Icon-label tabs with a bottom indicator strip** positioned between the hero image and the content container. Each tab shows a Lucide icon + text label. The active tab is indicated by a `var(--color-primary)` 2px bottom border flush with the strip's lower edge. This fits the app's clean, spacious philosophy (no heavy segments, no sidebar) and is instantly legible on both mobile and desktop.

The tab strip is **not sticky** — the navbar is already sticky at 64px; adding a second sticky layer on mobile eats too much viewport. Users see the hero, then the tab strip, then the content; scrolling is natural.

---

### New component: TripTabBar

**Location:** `src/components/TripTabBar/`

```
src/components/TripTabBar/
├── TripTabBar.tsx
├── TripTabBar.module.css
└── index.ts
```

**Props:**
```ts
interface TripTabBarProps {
  tabs: readonly { id: string; label: string; Icon: LucideIcon }[];
  active: string;
  onChange: (id: string) => void;
}
```

**HTML structure:**
```html
<div class="strip">
  <nav role="tablist" aria-label="Trip sections" class="inner">
    <button
      role="tab"
      id="tab-{id}"
      aria-selected="true|false"
      aria-controls="tabpanel-{id}"
      tabIndex="0 (active) | -1 (inactive)"
      class="tab [active]"
    >
      <Icon size={16} aria-hidden="true" />
      <span>{label}</span>
    </button>
    ...
  </nav>
</div>
```

---

### Tab Bar Styles (TripTabBar.module.css)

```css
/* Outer strip */
.strip {
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

/* Inner centering wrapper */
.inner {
  display: flex;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  -webkit-overflow-scrolling: touch;
}
.inner::-webkit-scrollbar { display: none; }

/* Individual tab button */
.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 20px;
  min-width: fit-content;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;          /* flush with strip border-bottom */
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: color var(--duration-fast) var(--easing-out),
              border-color var(--duration-fast) var(--easing-out);
  white-space: nowrap;
}

.tab:hover {
  color: var(--color-text-secondary);
}

.tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
  border-radius: 2px;
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
```

---

### Tabs definition (inside TripDetailClient.tsx)

Import icons from `lucide-react`:
```ts
import { LayoutDashboard, Plane, BedDouble, Wallet, MapPin } from "lucide-react";
```

Define tab list as a module-level constant (outside the component):
```ts
const TRIP_TABS = [
  { id: "overview",    label: "Overview",    Icon: LayoutDashboard },
  { id: "flights",     label: "Flights",     Icon: Plane           },
  { id: "residences",  label: "Residences",  Icon: BedDouble       },
  { id: "expenses",    label: "Expenses",    Icon: Wallet          },
  { id: "attractions", label: "Attractions", Icon: MapPin          },
] as const;

type TripTabId = typeof TRIP_TABS[number]["id"];
const VALID_TAB_IDS = new Set<string>(TRIP_TABS.map((t) => t.id));
```

---

### URL sync (no Suspense needed)

Read the initial tab from `window.location.search` in a `useEffect` so it runs client-side only — avoids any Suspense requirement on the page component.

```ts
const [activeTab, setActiveTab] = useState<TripTabId>("overview");

// Sync tab from URL on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab && VALID_TAB_IDS.has(tab)) setActiveTab(tab as TripTabId);
}, []);

function switchTab(id: TripTabId) {
  setActiveTab(id);
  window.history.replaceState({}, "", `?tab=${id}`);
}
```

---

### Tab panel content mapping

| Tab id | Content rendered |
|---|---|
| `overview` | Overview card (infoGrid + people row) + TripSharingPanel (owner only) |
| `flights` | `<FlightsList>` |
| `residences` | `<ResidencesList>` |
| `expenses` | `<ExpensesPanel>` |
| `attractions` | Attractions card (list + pagination) + `<CalendarSection>` |

Each active panel is wrapped:
```html
<div role="tabpanel" id="tabpanel-{activeTab}" aria-labelledby="tab-{activeTab}">
  {/* section content */}
</div>
```

Only the active panel is rendered (not all panels with `display: none`) — simpler and avoids loading all sections eagerly.

---

### Keyboard navigation (ARIA tablist)

Handle `onKeyDown` on the `<nav role="tablist">` element:

| Key | Action |
|---|---|
| `ArrowRight` | Move focus to next tab (wrap to first) |
| `ArrowLeft` | Move focus to previous tab (wrap to last) |
| `Home` | Focus first tab |
| `End` | Focus last tab |

Active tab gets `tabIndex={0}`, all others get `tabIndex={-1}`. Pressing Enter/Space on a focused tab calls `onChange`.

---

### Page structure after refactor

```
<main>
  <div class="hero">…</div>          ← unchanged

  <TripTabBar
    tabs={TRIP_TABS}
    active={activeTab}
    onChange={switchTab}
  />

  <div class="container">            ← unchanged wrapper
    <div role="tabpanel" id="tabpanel-{activeTab}" aria-labelledby="tab-{activeTab}">
      {activeTab === "overview"    && <OverviewContent ... />}
      {activeTab === "flights"     && <FlightsList ... />}
      {activeTab === "residences"  && <ResidencesList ... />}
      {activeTab === "expenses"    && <ExpensesPanel ... />}
      {activeTab === "attractions" && <AttractionsContent ... />}
    </div>
  </div>

  {/* Modals — unchanged, always rendered */}
</main>
```

The existing `sharingSection`, `card`, and other class usages inside the container stay — they just become conditionally rendered under the correct `activeTab` check.

---

### Files to create / modify

| Action | File |
|---|---|
| Create | `src/components/TripTabBar/TripTabBar.tsx` |
| Create | `src/components/TripTabBar/TripTabBar.module.css` |
| Create | `src/components/TripTabBar/index.ts` |
| Modify | `src/components/index.ts` — add `TripTabBar` barrel export |
| Modify | `src/app/trips/[id]/TripDetailClient.tsx` — add tab state, URL sync, TripTabBar, conditional panel rendering |
| Modify | `src/app/trips/[id]/TripDetailClient.module.css` — add `.tabPanel` if needed |

No new API routes. No swagger changes.

## Implementation Notes
- Files created/modified:
  - `src/components/TripTabBar/TripTabBar.tsx` — new component: icon-label tabs with ARIA tablist, arrow-key navigation, active bottom-border indicator
  - `src/components/TripTabBar/TripTabBar.module.css` — strip, inner scroll container, tab button states
  - `src/components/TripTabBar/index.ts` — barrel export
  - `src/components/index.ts` — added TripTabBar export
  - `src/app/trips/[id]/TripDetailClient.tsx` — added TRIP_TABS constant, TripTabId type, activeTab state, URL sync via window.history.replaceState, switchTab, TripTabBar wiring, full conditional tab panel rendering
  - `src/app/trips/[id]/TripDetailClient.module.css` — added .tabPanel (grid-column: 1/-1, flex column, gap 24px)
- Deviations from brief:
  - `switchTab` accepts `string` (not `TripTabId`) so its signature matches TripTabBar's `onChange: (id: string) => void` — casts to TripTabId internally. Required to satisfy TypeScript without over-coupling the generic component to the consumer's narrow type.
  - CalendarSection moved inside the container div (under the attractions tab panel) — it was previously rendered outside the container. CalendarSection is a card component that renders cleanly at container width; no visual regression.
- New design tokens used: none — all existing tokens

## Completion Summary
Implemented the TripTabBar component and wired it into the trips/[id] page with five tabs: Overview, Attractions, Flights, Residences, Expenses. Each tab shows only its own content (not hidden with CSS), the active tab is indicated by a 2px primary-colored bottom border, arrow-key navigation follows the ARIA tablist pattern, and the selected tab syncs to the URL via `?tab=<id>` using `window.history.replaceState`. CalendarSection was moved into the Overview tab. Confirmed done by user on 2026-07-10.
