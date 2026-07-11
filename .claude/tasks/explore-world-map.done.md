# Task: Explore World Map Page

Status: done

Track: A
Track reason: new full-page layout with interactive world map, city selection, attraction markers, filter panel — no existing pattern

## Problem
"Explore" in the nav bar is a dead anchor (`/#explore`) that scrolls the home page to a section of public trip cards. Users have no way to browse the attraction database geographically — there's no map-based discovery experience.

## Goal
A dedicated `/explore` route with a world map showing all cities that have public attractions, so any user (logged in or not) can click a city, see its attractions on the map, filter by type/category, open attraction detail cards, and (when logged in) add a new attraction.

## Requirements

### Functional
- **Nav link**: Change `href="/#explore"` → `href="/explore"` in `Navbar.tsx` (both desktop `<ul>` and mobile menu). Keep the `<Compass>` icon and "Explore" label.
- **World map**: Leaflet map (same library already used in `TripDayMapWidget`) showing city-level pin clusters. Each pin represents a city that has ≥ 1 public attraction.
- **City selection**: Clicking a city pin zooms the map in and shows individual attraction markers for that city.
- **Attraction markers**: Styled per attraction type (same `makeMarkerIcon` pattern from `TripDayMapWidget`). Clicking a marker opens `AttractionDetailModal` (same component used in `trips/[id]`).
- **Filter panel**: Multi-select filter for attraction **types** and **categories** (using `useAttractionTypes` and `useAttractionCategories` hooks that already exist). Filters apply client-side to the currently visible city's attractions.
- **Add Attraction button**: Visible when user is logged in. Opens `NewAttractionModal` (existing component). After save, the new attraction appears on the map if it matches the selected city.
- **Public access**: Page is viewable without login (same rule as `/explore` social feed — no private attractions). Add Attraction is auth-gated.
- **Attraction data source**: Call `GET /api/attractions` (already exists) with a city filter once a city is selected. For the world-level view, fetch distinct cities that have attractions (a new lightweight API endpoint: `GET /api/attractions/cities` returning `{ cities: string[] }` with lat/lng for map placement).

### Non-functional
- Map loads via `next/dynamic` with `ssr: false` (same pattern as `TripDayMapWidget`)
- Mobile-responsive: on small screens the filter panel collapses behind a toggle button; map takes full width
- Page title: "Explore the World · TripPlanner"

## Constraints
- No Tailwind, no inline styles — CSS Modules only
- Leaflet is already installed; reuse `decodePolyline` / marker patterns from `TripDayMapWidget` if helpful
- `AttractionDetailModal` and `NewAttractionModal` are existing components — import as-is, do not fork them
- `useAttractionTypes` / `useAttractionCategories` hooks already exist — use them for filter data
- Existing `/api/attractions` GET route already supports `?city=` filtering — use it
- City coordinate lookup: the existing `AIRPORTS` map in `airportData.ts` won't help here. City lat/lng should come from a simple hardcoded lookup in the new `GET /api/attractions/cities` response, or be derived from attraction coordinates (group by city, take the mean lat/lng of that city's attractions)

## Out of scope
- Replacing or removing the existing home-page ExploreSection (trip discovery feed)
- Street-level routing or directions between attractions (that's the TripDayMapWidget job)
- User reviews or ratings on attractions
- Saving/bookmarking attractions from this page

---

## Design Brief

### Architecture

**New files:**
1. `src/app/explore/page.tsx` — server wrapper (metadata only)
2. `src/app/explore/ExploreClient.tsx` — main client component (`"use client"`)
3. `src/app/explore/ExploreClient.module.css`
4. `src/app/explore/ExploreMapWidget.tsx` — Leaflet map (`"use client"`, loaded via `next/dynamic`)
5. `src/app/explore/ExploreMapWidget.module.css`
6. `src/app/api/attractions/cities/route.ts` — new API endpoint

**Modified files:**
7. `src/components/Navbar/Navbar.tsx`
8. `src/components/Navbar/Navbar.module.css`
9. `src/app/api/attractions/route.ts` — add `city` param, make `country` optional when `city` is given
10. `swagger.yaml`

---

### 1. `src/app/explore/page.tsx`

```tsx
import type { Metadata } from "next";
import { ExploreClient } from "./ExploreClient";

export const metadata: Metadata = {
  title: "Explore the World · TripPlanner",
  description: "Browse public attractions around the world by city.",
};

export default function ExplorePage() {
  return <ExploreClient />;
}
```

---

### 2. Layout — `ExploreClient.module.css`

```css
/* Full-height split: sidebar left, map right */
.page {
  display: flex;
  height: calc(100dvh - 64px);
  overflow: hidden;
  background: var(--color-bg-subtle);
}

/* ── Sidebar ── */
.sidebar {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border-subtle);
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebarHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 12px;
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.sidebarTitle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.sidebarTitleIcon {
  color: var(--color-primary);
}

/* Close button — mobile only */
.sidebarClose {
  display: none;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
}
.sidebarClose:hover { background: var(--color-bg-subtle); color: var(--color-text-primary); }
.sidebarClose:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

/* World-mode prompt */
.worldPrompt {
  padding: 24px 16px;
  color: var(--color-text-tertiary);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
}

/* City pills (world mode browse list) */
.cityList {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cityListLabel {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  margin-bottom: 8px;
}

.cityPill {
  height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--duration-fast) var(--easing-out);
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}
.cityPill:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}
.cityPill:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.cityPillCount {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  background: var(--color-border-subtle);
  border-radius: var(--radius-full);
  padding: 1px 7px;
  line-height: 1.6;
}

/* City mode */
.backBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 12px 16px 0;
  padding: 6px 8px;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--duration-fast) var(--easing-out);
}
.backBtn:hover { background: var(--color-bg-subtle); color: var(--color-primary); }
.backBtn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.cityHeading {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 8px 16px 2px;
}

.cityCount {
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin: 0 16px 12px;
}

/* Filter sections */
.filterSection {
  padding: 12px 16px 0;
  border-top: 1px solid var(--color-border-subtle);
}

.filterLabel {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  margin-bottom: 8px;
  display: block;
}

.chipGroup {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 12px;
}

.chip {
  height: 30px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--duration-fast) var(--easing-out);
  display: flex;
  align-items: center;
  gap: 4px;
}
.chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.chipActive {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 600;
}
.chip:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

/* Clear + Add buttons pinned to bottom */
.sidebarFooter {
  margin-top: auto;
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.clearBtn {
  height: 38px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: none;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--duration-fast) var(--easing-out);
}
.clearBtn:hover { border-color: var(--color-error); color: var(--color-error); }
.clearBtn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.addBtn {
  height: 44px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background var(--duration-fast) var(--easing-out), transform var(--duration-fast) var(--easing-out);
}
.addBtn:hover { background: var(--color-accent-dark); transform: translateY(-1px); }
.addBtn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

/* ── Map area ── */
.mapArea {
  flex: 1;
  min-width: 0;
  position: relative;
}

/* Mobile filter toggle button (floating) */
.filterToggleBtn {
  display: none;
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 400;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  transition: all var(--duration-fast) var(--easing-out);
}
.filterToggleBtn:hover { background: var(--color-primary-light); color: var(--color-primary); border-color: var(--color-primary); }
.filterToggleBtn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

/* Active-filter badge on toggle button */
.filterBadge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  line-height: 1;
}

/* Loading overlay on map area */
.mapLoadingOverlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.7);
  z-index: 500;
  pointer-events: none;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Mobile overrides (< 1024px) ── */
@media (max-width: 1023px) {
  .sidebar {
    position: fixed;
    top: 64px;
    left: 0;
    bottom: 0;
    z-index: 300;
    width: min(300px, calc(100vw - 48px));
    transform: translateX(-100%);
    transition: transform var(--duration-slow) var(--easing-out);
    box-shadow: var(--shadow-xl);
  }
  .sidebarOpen {
    transform: translateX(0);
  }
  .sidebarClose {
    display: flex;
  }
  .filterToggleBtn {
    display: flex;
  }
  .mapArea {
    width: 100%;
  }
}
```

---

### 3. `ExploreClient.tsx` — Component

```tsx
"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Globe, Plus, ChevronLeft, SlidersHorizontal, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";
import { useAttractionCategories } from "@/hooks/useAttractionCategories";
import { AttractionDetailModal } from "@/components/AttractionDetailModal/AttractionDetailModal";
import { NewAttractionModal } from "@/components/NewAttractionModal/NewAttractionModal";
import type { Attraction } from "@/types/attraction";
import type { AttractionFormData } from "@/components/NewAttractionModal/attraction.types";
import styles from "./ExploreClient.module.css";

// Leaflet must never render on the server
const ExploreMapWidget = dynamic(() => import("./ExploreMapWidget").then(m => ({ default: m.ExploreMapWidget })), {
  ssr: false,
  loading: () => <div className={styles.spinner} style={{ margin: "auto", marginTop: 80 }} />,
});

export interface CityEntry {
  name: string;
  lat: number;
  lng: number;
  count: number;
}

export function ExploreClient() {
  const { user, token } = useAuth();
  const { types, byCategory } = useAttractionTypes();
  const { categories } = useAttractionCategories();

  // Data
  const [cities, setCities]                     = useState<CityEntry[]>([]);
  const [cityAttractions, setCityAttractions]   = useState<Attraction[]>([]);
  const [citiesLoading, setCitiesLoading]       = useState(true);
  const [attractionsLoading, setAttractionsLoading] = useState(false);

  // View state
  const [selectedCity, setSelectedCity]         = useState<string | null>(null);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [addModalOpen, setAddModalOpen]         = useState(false);
  const [sidebarOpen, setSidebarOpen]           = useState(false);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes]           = useState<string[]>([]);

  // Map imperative control ref (to flyTo on city select)
  const mapRef = useRef<{ flyToCity: (lat: number, lng: number) => void; flyToWorld: () => void } | null>(null);

  // Load cities on mount
  useEffect(() => {
    setCitiesLoading(true);
    fetch("/api/attractions/cities")
      .then(r => r.json())
      .then((data: { cities: CityEntry[] }) => setCities(data.cities ?? []))
      .catch(() => {})
      .finally(() => setCitiesLoading(false));
  }, []);

  // Load attractions when city changes
  useEffect(() => {
    if (!selectedCity) { setCityAttractions([]); return; }
    setAttractionsLoading(true);
    fetch(`/api/attractions?city=${encodeURIComponent(selectedCity)}`)
      .then(r => r.json())
      .then((data: Attraction[]) => setCityAttractions(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setAttractionsLoading(false));
  }, [selectedCity]);

  // Client-side filtering
  const filteredAttractions = useMemo(() => {
    return cityAttractions.filter(a => {
      const typeNames = (a.types ?? []) as string[];
      const passCategory =
        selectedCategories.length === 0 ||
        typeNames.some(t => {
          const cat = Object.entries(byCategory).find(([, ts]) => ts.some(tp => tp.name === t))?.[0];
          return cat && selectedCategories.includes(cat);
        });
      const passType =
        selectedTypes.length === 0 || typeNames.some(t => selectedTypes.includes(t));
      return passCategory && passType;
    });
  }, [cityAttractions, selectedCategories, selectedTypes, byCategory]);

  // Categories that actually appear in the current city's attractions
  const availableCategories = useMemo(() => {
    if (!selectedCity) return categories;
    const typeNamesInCity = new Set(cityAttractions.flatMap(a => (a.types ?? []) as string[]));
    return categories.filter(cat =>
      (byCategory[cat] ?? []).some(t => typeNamesInCity.has(t.name))
    );
  }, [categories, byCategory, cityAttractions, selectedCity]);

  // Types that appear in current city (or filtered by selected categories)
  const availableTypes = useMemo(() => {
    const typeNamesInCity = new Set(cityAttractions.flatMap(a => (a.types ?? []) as string[]));
    return types.filter(t => {
      const inCity = typeNamesInCity.has(t.name);
      const inCategory = selectedCategories.length === 0 ||
        selectedCategories.some(cat => (byCategory[cat] ?? []).some(bt => bt.name === t.name));
      return inCity && inCategory;
    });
  }, [types, byCategory, cityAttractions, selectedCategories]);

  const hasActiveFilters = selectedCategories.length > 0 || selectedTypes.length > 0;
  const activeFilterCount = selectedCategories.length + selectedTypes.length;

  const handleCitySelect = useCallback((city: CityEntry) => {
    setSelectedCity(city.name);
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSidebarOpen(false); // close mobile sidebar when city selected
    mapRef.current?.flyToCity(city.lat, city.lng);
  }, []);

  const handleBackToWorld = useCallback(() => {
    setSelectedCity(null);
    setCityAttractions([]);
    setSelectedCategories([]);
    setSelectedTypes([]);
    mapRef.current?.flyToWorld();
  }, []);

  function toggleCategory(cat: string) {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
    setSelectedTypes(prev => prev.filter(t => {
      const parentCat = Object.entries(byCategory).find(([, ts]) => ts.some(tp => tp.name === t))?.[0];
      // Keep type if its category is staying in the selection OR being added
      return parentCat !== cat || selectedCategories.includes(cat);
    }));
  }

  function toggleType(typeName: string) {
    setSelectedTypes(prev =>
      prev.includes(typeName) ? prev.filter(t => t !== typeName) : [...prev, typeName]
    );
  }

  async function handleAddSave(data: AttractionFormData) {
    if (!token) return;
    const res = await fetch("/api/attractions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    const newAttraction = await res.json() as Attraction;
    setAddModalOpen(false);
    if (selectedCity && newAttraction.city === selectedCity) {
      setCityAttractions(prev => [...prev, newAttraction]);
    }
  }

  const cityEntry = useMemo(() => cities.find(c => c.name === selectedCity) ?? null, [cities, selectedCity]);

  return (
    <div className={styles.page}>
      {/* ── Sidebar ── */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
        aria-label="Explore filters"
      >
        <div className={styles.sidebarHeader}>
          <h1 className={styles.sidebarTitle}>
            <Globe size={18} className={styles.sidebarTitleIcon} aria-hidden="true" />
            Explore
          </h1>
          <button
            type="button"
            className={styles.sidebarClose}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close filters"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {!selectedCity ? (
          /* World mode */
          <>
            <p className={styles.worldPrompt}>
              Click a city pin on the map — or choose from the list below — to explore its attractions.
            </p>
            {!citiesLoading && cities.length > 0 && (
              <div className={styles.cityList}>
                <span className={styles.cityListLabel}>Cities</span>
                {cities.map(c => (
                  <button
                    key={c.name}
                    type="button"
                    className={styles.cityPill}
                    onClick={() => handleCitySelect(c)}
                  >
                    {c.name}
                    <span className={styles.cityPillCount}>{c.count}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* City mode */
          <>
            <button type="button" className={styles.backBtn} onClick={handleBackToWorld}>
              <ChevronLeft size={15} aria-hidden="true" />
              World view
            </button>
            <h2 className={styles.cityHeading}>{selectedCity}</h2>
            <p className={styles.cityCount}>
              {filteredAttractions.length} of {cityAttractions.length} attractions
            </p>

            {/* Category filter */}
            {availableCategories.length > 0 && (
              <div className={styles.filterSection}>
                <span className={styles.filterLabel}>Categories</span>
                <div className={styles.chipGroup} role="group" aria-label="Filter by category">
                  {availableCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.chip} ${selectedCategories.includes(cat) ? styles.chipActive : ""}`}
                      aria-pressed={selectedCategories.includes(cat)}
                      onClick={() => toggleCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type filter */}
            {availableTypes.length > 0 && (
              <div className={styles.filterSection}>
                <span className={styles.filterLabel}>Types</span>
                <div className={styles.chipGroup} role="group" aria-label="Filter by type">
                  {availableTypes.map(t => (
                    <button
                      key={t.name}
                      type="button"
                      className={`${styles.chip} ${selectedTypes.includes(t.name) ? styles.chipActive : ""}`}
                      aria-pressed={selectedTypes.includes(t.name)}
                      onClick={() => toggleType(t.name)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.sidebarFooter}>
              {hasActiveFilters && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => { setSelectedCategories([]); setSelectedTypes([]); }}
                >
                  Clear filters
                </button>
              )}
              {user && (
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => setAddModalOpen(true)}
                >
                  <Plus size={16} aria-hidden="true" />
                  Add Attraction
                </button>
              )}
            </div>
          </>
        )}
      </aside>

      {/* ── Map area ── */}
      <div className={styles.mapArea}>
        {/* Mobile filter toggle */}
        <button
          type="button"
          className={styles.filterToggleBtn}
          onClick={() => setSidebarOpen(v => !v)}
          aria-label={`${sidebarOpen ? "Close" : "Open"} filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
          aria-expanded={sidebarOpen}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          {activeFilterCount > 0 && (
            <span className={styles.filterBadge} aria-hidden="true">{activeFilterCount}</span>
          )}
        </button>

        {attractionsLoading && (
          <div className={styles.mapLoadingOverlay} aria-live="polite" aria-label="Loading attractions">
            <div className={styles.spinner} />
          </div>
        )}

        <ExploreMapWidget
          cities={cities}
          selectedCity={selectedCity}
          attractions={filteredAttractions}
          onCityClick={handleCitySelect}
          onAttractionClick={setSelectedAttraction}
          mapRef={mapRef}
        />
      </div>

      {/* Modals */}
      <AttractionDetailModal
        attraction={selectedAttraction}
        onClose={() => setSelectedAttraction(null)}
      />
      {addModalOpen && (
        <NewAttractionModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSave={handleAddSave}
        />
      )}
    </div>
  );
}
```

**Note on `useAttractionCategories` hook:** Check if it exists at `src/hooks/useAttractionCategories.ts`. If not, derive categories from `useAttractionTypes`:
```ts
const { byCategory } = useAttractionTypes();
const categories = Object.keys(byCategory); // string[]
```
Remove the `useAttractionCategories` import and derive locally.

---

### 4. `ExploreMapWidget.tsx`

```tsx
"use client";

import { useEffect, useRef, MutableRefObject } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Globe, MapPin } from "lucide-react";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";
import type { Attraction } from "@/types/attraction";
import type { CityEntry } from "./ExploreClient";
import styles from "./ExploreMapWidget.module.css";
import "leaflet/dist/leaflet.css";

// Fix broken default Leaflet icons under webpack
/* eslint-disable @typescript-eslint/no-explicit-any */
delete (L.Icon.Default.prototype as any)._getIconUrl;
/* eslint-enable @typescript-eslint/no-explicit-any */
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── City pin DivIcon ──────────────────────────────────────────────
function makeCityMarkerIcon(isSelected: boolean): L.DivIcon {
  const bg = isSelected ? "#D97706" : "#0284C7";
  let iconSvg = "";
  try { iconSvg = renderToStaticMarkup(<Globe size={16} color="#ffffff" aria-hidden="true" />); } catch { /* */ }
  return L.divIcon({
    html: `<div style="width:40px;height:40px;border-radius:50%;background:${bg};border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;cursor:pointer">${iconSvg}</div>`,
    iconSize: [40, 40] as [number, number],
    iconAnchor: [20, 20] as [number, number],
    className: "",
  });
}

// ── Attraction pin DivIcon (type-colored) ─────────────────────────
function makeAttractionMarkerIcon(color: string): L.DivIcon {
  let iconSvg = "";
  try { iconSvg = renderToStaticMarkup(<MapPin size={14} color="#ffffff" aria-hidden="true" />); } catch { /* */ }
  return L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center">${iconSvg}</div>`,
    iconSize: [30, 30] as [number, number],
    iconAnchor: [15, 15] as [number, number],
    className: "",
  });
}

// ── Imperative map controller (fly-to) ───────────────────────────
interface MapControllerProps {
  mapRef: MutableRefObject<{ flyToCity: (lat: number, lng: number) => void; flyToWorld: () => void } | null>;
}

function MapController({ mapRef }: MapControllerProps) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = {
      flyToCity: (lat, lng) => map.flyTo([lat, lng], 12, { duration: 1.2 }),
      flyToWorld: () => map.flyTo([20, 0], 2, { duration: 1.2 }),
    };
  }, [map, mapRef]);
  return null;
}

// ── Main widget ──────────────────────────────────────────────────
interface ExploreMapWidgetProps {
  cities: CityEntry[];
  selectedCity: string | null;
  attractions: Attraction[];
  onCityClick: (city: CityEntry) => void;
  onAttractionClick: (attraction: Attraction) => void;
  mapRef: MutableRefObject<{ flyToCity: (lat: number, lng: number) => void; flyToWorld: () => void } | null>;
}

export function ExploreMapWidget({
  cities, selectedCity, attractions, onCityClick, onAttractionClick, mapRef,
}: ExploreMapWidgetProps) {
  const { colorForType } = useAttractionTypes();

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
      zoomControl
      scrollWheelZoom
      className={styles.map}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <MapController mapRef={mapRef} />

      {/* City pins — world view */}
      {!selectedCity && cities.map(city => (
        <Marker
          key={city.name}
          position={[city.lat, city.lng]}
          icon={makeCityMarkerIcon(false)}
          eventHandlers={{ click: () => onCityClick(city) }}
        >
          <Tooltip direction="top" offset={[0, -20]} permanent={false}>
            <strong>{city.name}</strong> · {city.count} attraction{city.count !== 1 ? "s" : ""}
          </Tooltip>
        </Marker>
      ))}

      {/* Attraction pins — city view */}
      {selectedCity && attractions.map(a => {
        if (!a.coordinates) return null;
        const color = colorForType(a.types?.[0] ?? "");
        return (
          <Marker
            key={a._id}
            position={[a.coordinates.lat, a.coordinates.lng]}
            icon={makeAttractionMarkerIcon(color)}
            eventHandlers={{ click: () => onAttractionClick(a) }}
          >
            <Tooltip direction="top" offset={[0, -15]}>
              <strong>{a.name}</strong>
              {a.types?.[0] ? ` · ${a.types[0]}` : ""}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
```

### 5. `ExploreMapWidget.module.css`

```css
.map {
  height: 100%;
  width: 100%;
}
```

---

### 6. `GET /api/attractions/cities` — New Endpoint

**File:** `src/app/api/attractions/cities/route.ts`

```ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Attraction } from "@/models/Attraction";

export async function GET() {
  try {
    await dbConnect();
    const result = await Attraction.aggregate([
      {
        $match: {
          "coordinates.lat": { $exists: true, $ne: null },
          "coordinates.lng": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$city",
          lat:   { $avg: "$coordinates.lat" },
          lng:   { $avg: "$coordinates.lng" },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, name: "$_id", lat: 1, lng: 1, count: 1 } },
      { $sort: { count: -1 } },
    ]);
    return NextResponse.json({ cities: result });
  } catch {
    return NextResponse.json({ error: "Failed to load cities" }, { status: 500 });
  }
}
```

---

### 7. Modify `GET /api/attractions` — Add `city` param

In `src/app/api/attractions/route.ts`, change:

```ts
// OLD (requires country):
const country = searchParams.get("country");
if (!country?.trim()) {
  return NextResponse.json({ error: "country param is required" }, { status: 400 });
}
...
const filter: Record<string, unknown> = { country };
...
const attractions = await Attraction.find(filter)
  .populate("types")
  .sort({ name: 1 })
  .limit(20);
```

To:

```ts
const country = searchParams.get("country");
const city    = searchParams.get("city");

// At least one of country or city is required
if (!country?.trim() && !city?.trim()) {
  return NextResponse.json({ error: "country or city param is required" }, { status: 400 });
}

...

const filter: Record<string, unknown> = {};
if (country?.trim()) filter.country = country.trim();
if (city?.trim())    filter.city    = city.trim();
if (q?.trim())       filter.name    = { $regex: q.trim(), $options: "i" };
if (type?.trim()) {
  const typeDoc = await AttractionType.findOne({ name: type.trim() }).select("_id");
  if (!typeDoc) return NextResponse.json([]);
  filter.types = typeDoc._id;
}
if (hiddenIds.length > 0) filter._id = { $nin: hiddenIds };

// City-based browse returns more results than text search
const limit = city?.trim() ? 100 : 20;

const attractions = await Attraction.find(filter)
  .populate("types")
  .sort({ name: 1 })
  .limit(limit);
```

---

### 8. Navbar changes

In `src/components/Navbar/Navbar.tsx`:

**Desktop nav item** — change from `<a href="/#explore">` to:
```tsx
<Link
  href="/explore"
  className={`${styles.navLink} ${pathname === "/explore" ? styles.navLinkActive : ""}`}
>
  <Compass size={16} aria-hidden="true" />
  Explore
</Link>
```

**Mobile nav item** — change from `<a href="/#explore">` to:
```tsx
<Link
  href="/explore"
  className={styles.mobileNavLink}
  onClick={() => setMenuOpen(false)}
>
  <Compass size={18} aria-hidden="true" />
  Explore
</Link>
```

In `src/components/Navbar/Navbar.module.css`, add:
```css
.navLinkActive {
  color: var(--color-primary);
  font-weight: 600;
}
```

---

### 9. swagger.yaml additions

Add under `paths`:
```yaml
/api/attractions/cities:
  get:
    summary: List cities that have public attractions
    tags: [Attractions]
    responses:
      '200':
        description: City list with centroids and counts
        content:
          application/json:
            schema:
              type: object
              properties:
                cities:
                  type: array
                  items:
                    type: object
                    properties:
                      name:  { type: string }
                      lat:   { type: number }
                      lng:   { type: number }
                      count: { type: number }
```

Update `GET /api/attractions` to mark `country` as no longer required and document `city` param:
```yaml
parameters:
  - name: country
    in: query
    required: false   # was true
    schema: { type: string }
    description: Filter by country. Either country or city is required.
  - name: city
    in: query
    required: false
    schema: { type: string }
    description: Filter by city. Either country or city is required. Returns up to 100 results.
```

---

### Interaction Notes

- **Mobile sidebar overlay**: When `sidebarOpen` is true AND on mobile, clicking outside the sidebar should close it. Add a transparent backdrop `div` behind the sidebar (`position: fixed; inset: 0; z-index: 299; background: rgba(0,0,0,0.3)`) that renders only when `sidebarOpen && window.innerWidth < 1024`. Use `useState` + `useEffect` to track viewport width, OR simply render the backdrop always when `sidebarOpen` (it only appears via CSS on mobile).

- **After city selection on mobile**: `setSidebarOpen(false)` so the map is revealed.

- **`useAttractionCategories` hook**: Check existence at `src/hooks/useAttractionCategories.ts`. If it doesn't exist, derive from `useAttractionTypes`:
  ```ts
  const { byCategory } = useAttractionTypes();
  const categories = useMemo(() => Object.keys(byCategory), [byCategory]);
  ```
  Drop the separate hook import and derive inline in ExploreClient.

- **Map height**: `ExploreMapWidget.module.css` map height is `100%` — parent `.mapArea` must have `height: 100%` via the flex layout (`.page` is `height: calc(100dvh - 64px)`). This chain ensures Leaflet has a real pixel height.

- **No `onEditTime`** prop needed for `AttractionDetailModal` on this page — it's fine to omit it (prop is optional).

- **`types` field on Attraction**: `a.types` is populated by Mongoose and comes back as `string[]` (type names) via `formatAttraction`. Use `a.types?.[0]` as the type name for color lookup and display.

---

### Empty States

**No cities (citiesLoading = false, cities = []):**
```
<p className={styles.worldPrompt}>
  No attractions have been added to the database yet.
  <br />
  Be the first to add one!
</p>
{user && <button onClick={() => setAddModalOpen(true)} className={styles.addBtn}>...}
```

**City selected, no attractions matching filters:**
Shown via `filteredAttractions.length === 0 && cityAttractions.length > 0`:
In the sidebar below the type chips:
```tsx
<p style={{...}} className={styles.worldPrompt}>
  No attractions match the selected filters.
</p>
```

(Do NOT use inline styles — put the empty-state paragraph inside the existing `.worldPrompt` class, it already applies to centered tertiary text.)

## Completion Summary
The Explore World Map page was fully built and iterated through two rounds of feedback. The final feature delivers a three-level geographic drill-down (world → country → city) with real administrative boundary polygons from Nominatim for both country and city views, type-specific attraction pin icons, a sidebar filter panel with category and type multi-select, an always-visible "Add Attraction" footer pinned outside the scroll area, and attraction detail / add-attraction modals that correctly layer above the Leaflet map at z-index 1000. Confirmed done by the user on 2026-07-11.

## Implementation Notes
- Files created/modified:
  - NEW: `src/app/explore/page.tsx`
  - NEW: `src/app/explore/ExploreClient.tsx`
  - NEW: `src/app/explore/ExploreClient.module.css`
  - NEW: `src/app/explore/ExploreMapWidget.tsx`
  - NEW: `src/app/explore/ExploreMapWidget.module.css`
  - NEW: `src/app/api/attractions/cities/route.ts`
  - MOD: `src/app/api/attractions/route.ts` — added `city` param, `country` now optional, limit 100 for city queries
  - MOD: `src/components/Navbar/Navbar.tsx` — both Explore links changed from `<a href="/#explore">` to `<Link href="/explore">` with active state
  - MOD: `src/components/Navbar/Navbar.module.css` — added `position: relative` to `.navLink` so `::after` indicator renders correctly
  - MOD: `swagger.yaml` — documented `GET /api/attractions`, `GET /api/attractions/cities`, updated country param to required: false
- Deviations from brief:
  - Used `useAttractionTypes().categories` (already `string[]`) instead of `useAttractionCategories()` which returns `AttractionCategoryRecord[]` objects — avoids a `.map(c => c.name)` step and removes an extra API call
  - Added `position: relative` to `.navLink` (not in brief) — required for the existing `navLinkActive::after` dot indicator to position correctly
  - Added `.spinnerCentered` CSS class instead of inline `style={{ margin: "auto", marginTop: 80 }}` on the dynamic loading fallback
  - Removed `style={{ height: "100%", width: "100%" }}` from `MapContainer` — uses `className={styles.map}` instead (same values, no inline style)
  - `makeCityMarkerIcon` simplified to take no arguments (isSelected flag removed — all pins stay blue; no `selectedCity` state available at icon creation time)
  - `.navLinkActive` already existed in Navbar.module.css — not re-added
- New design tokens used: none

