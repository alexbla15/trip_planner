"use client";

import { useEffect, useState, useMemo, type MutableRefObject } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, Circle, Polyline, GeoJSON as GeoJSONLayer, useMap, useMapEvents } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import { useAttractionTypes } from "@/hooks";
import { getCityBoundary, getCountryBoundary } from "@/services";
import type { TravelMode, RouteLeg } from "@/services";
import { makeCountryMarkerIcon, makeAttractionMarkerIcon, makeCustomPinIcon } from "@/lib/mapIcons";
import { colorForBoundaryIndex } from "@/lib/mapBoundaryColors";
import { fixLeafletDefaultIcon } from "@/lib/leafletIconFix";
import { TRAVEL_MODE_COLORS } from "@/lib/travelModeColors";
import type { Attraction } from "@/types/attraction";
import type { CityEntry, CountryEntry, MapHandle, MeasurePoint } from "./ExploreClient";
import styles from "./ExploreMapWidget.module.css";
import "leaflet/dist/leaflet.css";

const MEASURE_MODE_COLORS = TRAVEL_MODE_COLORS;

// Clicking the map while in measure mode drops/replaces the custom pin — a plain
// useMapEvents click handler, same pattern already used for zoomend in ZoomWatcher.
function MeasureClickWatcher({ active, onMapClick }: { active: boolean; onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (active) onMapClick(e.latlng.lat, e.latlng.lng);
    },
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

  const view = selectedCity ? "city" : selectedCountry ? "country" : "world";

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
      {view === "world" &&
        countries.map((country) => (
          <Marker
            key={`pin-${country.name}`}
            position={[country.lat, country.lng]}
            icon={makeCountryMarkerIcon()}
            eventHandlers={{ click: () => onCountryClick(country) }}
          >
            <Tooltip direction="top" offset={[0, -22]}>
              <strong>{country.name}</strong>
              {" · "}{country.count} attraction{country.count !== 1 ? "s" : ""}
            </Tooltip>
          </Marker>
        ))}

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
      {(view === "country" || view === "city") &&
        attractions.map((a) => {
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
