"use client";

import { useEffect, useState, useMemo, type MutableRefObject } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, Circle, Polyline, GeoJSON as GeoJSONLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngBounds } from "leaflet";
import type { GeoJsonObject } from "geojson";
import { useAttractionTypes } from "@/hooks";
import { getCityBoundary, getCountryBoundary } from "@/services";
import type { TravelMode, RouteLeg } from "@/services";
import { makeAttractionMarkerIcon, makeCustomPinIcon, makeCityMarkerIcon, makeCityClusterIcon } from "@/lib/mapIcons";
import { CLUSTER_MARKER_BASE_SIZE_PX, CLUSTER_MARKER_MAX_SIZE_PX } from "@/lib/mapIcons.constants";
import { colorForBoundaryIndex } from "@/lib/mapBoundaryColors";
import { fixLeafletDefaultIcon } from "@/lib/leafletIconFix";
import { TRAVEL_MODE_COLORS } from "@/lib/travelModeColors";
import type { Attraction } from "@/types/attraction";
import type { CityEntry, CountryEntry, MapHandle, MeasurePoint } from "./ExploreClient";
import styles from "./ExploreMapWidget.module.css";
import "leaflet/dist/leaflet.css";

const MEASURE_MODE_COLORS = TRAVEL_MODE_COLORS;

// Below this zoom level, country view shows one aggregate pin per city instead of
// every individual attraction pin. Deliberately close to the city flyTo zoom (13) in
// MapController rather than merely "above the country flyTo zoom (5)" — for a small
// country, the visible viewport at zoom ~9-11 still spans nearly the whole country, so
// crossing the threshold there would dump every attraction in the country onto the map
// at once (the viewport-bounds filter alone isn't enough if the viewport itself hasn't
// actually narrowed to a city-sized area yet). At 12, the viewport is close to city
// scale, so individual pins only appear once they're meaningfully region-scoped.
const CITY_PIN_ZOOM_THRESHOLD = 12;

// Clicking the map while in measure mode drops/replaces the custom pin — a plain
// useMapEvents click handler, same pattern already used for zoomend/moveend in ViewportWatcher.
function MeasureClickWatcher({ active, onMapClick }: { active: boolean; onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (active) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Tracks the map's current zoom level and visible bounds — zoom drives the city-pin
// vs. individual-attraction-pin switch at CITY_PIN_ZOOM_THRESHOLD, and bounds limits
// the individual pins rendered to the currently visible region instead of every
// attraction in the whole country (which stays true even after zooming in on one area).
function ViewportWatcher({ onChange }: { onChange: (zoom: number, bounds: LatLngBounds) => void }) {
  useMapEvents({
    zoomend: (e) => onChange(e.target.getZoom(), e.target.getBounds()),
    moveend: (e) => onChange(e.target.getZoom(), e.target.getBounds()),
  });
  return null;
}

fixLeafletDefaultIcon();

// ── Map controller ────────────────────────────────────────────────────────────

function MapController({ mapRef }: { mapRef: MutableRefObject<MapHandle | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = {
      flyToWorld:   ()          => map.flyTo([20, 0], 2, { duration: 1.2 }),
      flyToCountry: (lat, lng)  => map.flyTo([lat, lng], 5, { duration: 1.2 }),
      flyToCity:    (lat, lng)  => map.flyTo([lat, lng], 13, { duration: 1.2 }),
    };
  }, [map, mapRef]);
  return null;
}

// Pixel distance under which two city pins would visually overlap/crowd — grouped into
// one cluster marker instead of stacking (see the "messy" country-view complaint this
// solves, e.g. several cities close together near Munich in Germany).
const CLUSTER_PIXEL_RADIUS = 45;

/** Greedy single-link clustering over on-screen pixel distance — cheap and good enough
 *  for the small number of cities in one country (dozens, not thousands), no need for a
 *  spatial index. Needs `useMap()` for pixel-accurate projection (`latLngToContainerPoint`),
 *  so it has to live in its own component rendered inside `<MapContainer>`, same as
 *  `MapController`/`ViewportWatcher` above. Only re-clusters on zoom, not on pan — the
 *  pixel distance between two fixed lat/lngs only changes with zoom, not with panning. */
function CityPinsLayer({ cities, zoom, onCityClick }: { cities: CityEntry[]; zoom: number; onCityClick: (city: CityEntry) => void }) {
  const map = useMap();

  const clusters = useMemo(() => {
    const points = cities.map((city) => ({ city, pt: map.latLngToContainerPoint([city.lat, city.lng]) }));
    const used = new Array(points.length).fill(false);
    const groups: (typeof points)[] = [];
    for (let i = 0; i < points.length; i++) {
      if (used[i]) continue;
      const group = [points[i]];
      used[i] = true;
      for (let j = i + 1; j < points.length; j++) {
        if (used[j]) continue;
        const dx = points[i].pt.x - points[j].pt.x;
        const dy = points[i].pt.y - points[j].pt.y;
        if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_PIXEL_RADIUS) {
          group.push(points[j]);
          used[j] = true;
        }
      }
      groups.push(group);
    }
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities, zoom]);

  return (
    <>
      {clusters.map((group) => {
        if (group.length === 1) {
          const c = group[0].city;
          return (
            <Marker key={`city-${c.name}`} position={[c.lat, c.lng]} icon={makeCityMarkerIcon(c.count)} eventHandlers={{ click: () => onCityClick(c) }}>
              <Tooltip direction="top" offset={[0, -22]}>
                <strong>{c.name}</strong>
                {" · "}{c.count} attraction{c.count !== 1 ? "s" : ""}
              </Tooltip>
            </Marker>
          );
        }
        const lat = group.reduce((sum, g) => sum + g.city.lat, 0) / group.length;
        const lng = group.reduce((sum, g) => sum + g.city.lng, 0) / group.length;
        const totalAttractions = group.reduce((sum, g) => sum + g.city.count, 0);
        const key = group.map((g) => g.city.name).sort().join("-");
        return (
          <Marker
            key={`cluster-${key}`}
            position={[lat, lng]}
            icon={makeCityClusterIcon(group.length, totalAttractions)}
            eventHandlers={{
              // Zoom/pan to fit the cluster's member cities — splits it apart into
              // individual (or smaller) clusters, standard "click to zoom" cluster UX.
              click: () => map.flyToBounds(group.map((g): [number, number] => [g.city.lat, g.city.lng]), {
                padding: [60, 60],
                maxZoom: CITY_PIN_ZOOM_THRESHOLD - 0.5,
                duration: 0.8,
              }),
            }}
          >
            <Tooltip direction="top" offset={[0, -clusterIconSize(group.length) / 2 - 6]}>
              <strong>{group.length} cities</strong>
              {" · "}{totalAttractions} attraction{totalAttractions !== 1 ? "s" : ""}
              <br />
              {group.map((g) => g.city.name).sort().join(", ")}
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

/** Mirrors the sizing formula in `makeCityClusterIcon` — kept in sync so the tooltip
 *  offset matches the marker's actual rendered size instead of drifting from it. */
function clusterIconSize(cityCount: number): number {
  return Math.min(CLUSTER_MARKER_MAX_SIZE_PX, CLUSTER_MARKER_BASE_SIZE_PX + cityCount * 2);
}

/** True when a boundary is the enclosing-municipality fallback (`src/app/api/geo/city/route.ts`)
 *  rather than the town's own boundary — used to render it visually distinct (dashed) so it
 *  doesn't read as a precise town shape. */
function isFallbackBoundary(boundary: GeoJsonObject): boolean {
  const props = (boundary as { properties?: Record<string, unknown> }).properties;
  return props?.isFallbackBoundary === true;
}

// ── Main widget ───────────────────────────────────────────────────────────────

interface ExploreMapWidgetProps {
  countries: CountryEntry[];
  selectedCountry: string | null;
  selectedCity: string | null;
  cities: CityEntry[];
  attractions: Attraction[];
  onCountryClick: (country: CountryEntry) => void;
  onCityClick: (city: CityEntry) => void;
  onAttractionClick: (attraction: Attraction) => void;
  mapRef: MutableRefObject<MapHandle | null>;
  measureMode: boolean;
  measurePoints: MeasurePoint[];
  measureLegMode: TravelMode;
  measureRoute: RouteLeg | null;
  onMeasureMapClick: (lat: number, lng: number) => void;
  onCustomPinClick: (lat: number, lng: number) => void;
}

export function ExploreMapWidget({
  countries,
  selectedCountry,
  selectedCity,
  cities,
  attractions,
  onCountryClick,
  onCityClick,
  onAttractionClick,
  mapRef,
  measureMode,
  measurePoints,
  measureLegMode,
  measureRoute,
  onMeasureMapClick,
  onCustomPinClick,
}: ExploreMapWidgetProps) {
  const { findType } = useAttractionTypes();

  const [cityBoundary, setCityBoundary] = useState<GeoJsonObject | null>(null);
  // Keyed by country name; populated in parallel when the countries list loads
  const [countryBoundaries, setCountryBoundaries] = useState<Map<string, GeoJsonObject | null>>(
    new Map()
  );
  // Keyed by city name; populated in parallel when the country-view city list loads
  useEffect(() => {
    if (countries.length === 0) return;
    countries.forEach((c) => {
      getCountryBoundary(c.name)
        .then((data) =>
          setCountryBoundaries((prev) => new Map(prev).set(c.name, data as GeoJsonObject | null))
        )
        .catch(() =>
          setCountryBoundaries((prev) => new Map(prev).set(c.name, null))
        );
    });
  }, [countries]);

  useEffect(() => {
    if (!selectedCity) { setCityBoundary(null); return; }
    getCityBoundary(selectedCity, selectedCountry ?? undefined)
      .then((data) => setCityBoundary(data as GeoJsonObject | null))
      .catch(() => setCityBoundary(null));
  }, [selectedCity, selectedCountry]);

  const countryEntry = useMemo(
    () => (selectedCountry ? countries.find((c) => c.name === selectedCountry) ?? null : null),
    [countries, selectedCountry]
  );

  const cityEntry = useMemo(
    () =>
      selectedCity
        ? cities.find((c) => c.name === selectedCity && c.country === selectedCountry) ?? null
        : null,
    [cities, selectedCity, selectedCountry]
  );

  const citiesInSelectedCountry = useMemo(
    () => (selectedCountry ? cities.filter((c) => c.country === selectedCountry) : []),
    [cities, selectedCountry]
  );

  const [zoom, setZoom] = useState(2);
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);

  const view = selectedCity ? "city" : selectedCountry ? "country" : "world";
  const showCityPins = view === "country" && zoom < CITY_PIN_ZOOM_THRESHOLD;

  // Once zoomed in (city-pin threshold crossed, or already in city view), only render
  // attractions actually within the visible map area — not every attraction in the
  // whole country — so panning/zooming around a region shows just that region's pins.
  const visibleAttractions = useMemo(() => {
    if (!bounds) return attractions;
    return attractions.filter(
      (a) => a.coordinates && bounds.contains([a.coordinates.lat, a.coordinates.lng])
    );
  }, [attractions, bounds]);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      zoomControl
      scrollWheelZoom
      className={styles.map}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <MapController mapRef={mapRef} />
      <MeasureClickWatcher active={measureMode} onMapClick={onMeasureMapClick} />
      <ViewportWatcher onChange={(z, b) => { setZoom(z); setBounds(b); }} />

      {/* ── World view: real country polygon (or circle while loading) + pin ── */}
      {view === "world" &&
        countries.map((country, i) => {
          const boundary = countryBoundaries.get(country.name) ?? null;
          const color = colorForBoundaryIndex(i);
          const tooltipLabel = `<strong>${country.name}</strong> · ${country.count} attraction${country.count !== 1 ? "s" : ""}`;
          return boundary ? (
            <GeoJSONLayer
              key={country.name}
              data={boundary}
              style={() => ({
                color,
                fillColor: color,
                fillOpacity: 0.2,
                weight: 2.5,
                opacity: 1,
              })}
              onEachFeature={(_, layer) => layer.bindTooltip(tooltipLabel, { direction: "top" })}
              eventHandlers={{ click: () => onCountryClick(country) }}
            />
          ) : (
            <Circle
              key={country.name}
              center={[country.lat, country.lng]}
              radius={country.radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.2,
                weight: 2.5,
                opacity: 1,
              }}
              eventHandlers={{ click: () => onCountryClick(country) }}
            >
              <Tooltip direction="top" offset={[0, -12]}>
                <strong>{country.name}</strong>
                {" · "}{country.count} attraction{country.count !== 1 ? "s" : ""}
              </Tooltip>
            </Circle>
          );
        })}
      {/* ── Country view: real boundary or circle fallback — individual attraction pins
          render below, shared with city view (no separate per-city breakdown here). ── */}
      {view === "country" && (() => {
        const boundary = selectedCountry ? countryBoundaries.get(selectedCountry) ?? null : null;
        return boundary ? (
          <GeoJSONLayer
            key={selectedCountry ?? ""}
            data={boundary}
            style={() => ({
              color: "#B45309",
              fillColor: "#F59E0B",
              fillOpacity: 0.22,
              weight: 3,
              opacity: 1,
            })}
          />
        ) : countryEntry ? (
          <Circle
            center={[countryEntry.lat, countryEntry.lng]}
            radius={countryEntry.radius}
            pathOptions={{
              color: "#B45309",
              fillColor: "#F59E0B",
              fillOpacity: 0.22,
              weight: 3,
              opacity: 1,
            }}
          />
        ) : null;
      })()}
      {/* ── City view: city boundary (real polygon, municipality fallback, or 8 km circle) ── */}
      {view === "city" && cityBoundary && (
        <GeoJSONLayer
          key={selectedCity ?? ""}
          data={cityBoundary}
          style={() => ({
            color: "#0369A1",
            fillColor: "#38BDF8",
            fillOpacity: 0.18,
            weight: 3,
            opacity: 1,
            dashArray: isFallbackBoundary(cityBoundary) ? "6 4" : undefined,
          })}
        />
      )}
      {view === "city" && !cityBoundary && cityEntry && (
        <Circle
          center={[cityEntry.lat, cityEntry.lng]}
          radius={8_000}
          pathOptions={{
            color: "#0369A1",
            fillColor: "#38BDF8",
            fillOpacity: 0.18,
            weight: 3,
            opacity: 1,
          }}
        />
      )}
      {/* ── Country view, zoomed out: one aggregate square pin per city instead of
          every individual attraction pin — crossing CITY_PIN_ZOOM_THRESHOLD reveals
          the attraction pins below instead. Pins that would visually overlap/crowd at
          the current zoom merge into a cluster marker (CityPinsLayer). ── */}
      {showCityPins && <CityPinsLayer cities={citiesInSelectedCountry} zoom={zoom} onCityClick={onCityClick} />}
      {(view === "city" || (view === "country" && !showCityPins)) &&
        visibleAttractions.map((a) => {
          if (!a.coordinates) return null;
          const typeRecord = findType(a.types?.[0] ?? "");
          const color    = typeRecord?.color   ?? "#64748B";
          const iconName = typeRecord?.icon    ?? "MapPin";
          const isMeasureSelected = measurePoints.some((p) => p.kind === "attraction" && p.attraction._id === a._id);
          return (
            <Marker
              key={a._id}
              position={[a.coordinates.lat, a.coordinates.lng]}
              icon={makeAttractionMarkerIcon(color, iconName, isMeasureSelected, a.isVisited)}
              eventHandlers={{ click: () => onAttractionClick(a) }}
            >
              <Tooltip direction="top" offset={[0, -17]}>
                <strong>{a.name}</strong>
                {a.types?.[0] ? ` · ${a.types[0]}` : ""}
                {isMeasureSelected ? " · Selected for measuring" : ""}
                {a.isVisited ? " · Visited" : ""}
              </Tooltip>
            </Marker>
          );
        })}

      {/* ── Measure-distance tool: custom dropped pin(s) + route between the 2 selected points ── */}
      {measurePoints
        .filter((p): p is Extract<MeasurePoint, { kind: "custom" }> => p.kind === "custom")
        .map((p, i) => (
          <Marker
            key={`measure-pin-${i}`}
            position={[p.lat, p.lng]}
            icon={makeCustomPinIcon()}
            eventHandlers={{ click: () => onCustomPinClick(p.lat, p.lng) }}
          >
            <Tooltip direction="top" offset={[0, -18]}>Dropped pin · click to save as an attraction</Tooltip>
          </Marker>
        ))}
      {measurePoints.length === 2 && (() => {
        const from = measurePoints[0].kind === "attraction" ? measurePoints[0].attraction.coordinates : measurePoints[0];
        const to   = measurePoints[1].kind === "attraction" ? measurePoints[1].attraction.coordinates : measurePoints[1];
        if (!from || !to) return null;
        const effectiveMode = measureRoute?.transitUnavailable ? "walk" : measureLegMode;
        const positions: [number, number][] = measureRoute?.geometry ?? [[from.lat, from.lng], [to.lat, to.lng]];
        return (
          <Polyline
            positions={positions}
            pathOptions={{
              color: MEASURE_MODE_COLORS[effectiveMode],
              weight: measureRoute ? 4 : 2,
              opacity: measureRoute ? 0.9 : 0.45,
              dashArray: measureRoute ? undefined : "6 4",
            }}
          />
        );
      })()}
    </MapContainer>
  );
}
