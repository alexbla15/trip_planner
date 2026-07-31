"use client";

import { useEffect, useState, useMemo, useCallback, type MutableRefObject } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, Circle, GeoJSON as GeoJSONLayer, useMap, useMapEvents } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import { useAttractionTypes } from "@/hooks";
import { getCityBoundary, getCountryBoundary } from "@/services";
import { makeCountryMarkerIcon, makeCityMarkerIcon, makeAttractionMarkerIcon } from "@/lib/mapIcons";
import { colorForBoundaryIndex } from "@/lib/mapBoundaryColors";
import type { Attraction } from "@/types/attraction";
import type { CityEntry, CountryEntry, MapHandle } from "./ExploreClient";
import styles from "./ExploreMapWidget.module.css";
import "leaflet/dist/leaflet.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
delete (L.Icon.Default.prototype as any)._getIconUrl;
/* eslint-enable @typescript-eslint/no-explicit-any */
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

// Reports the map's current zoom (initial + on every zoomend) so boundary labels can
// be shown/hidden based on how large a shape actually renders at the current zoom.
function ZoomWatcher({ onZoomChange }: { onZoomChange: (map: L.Map, zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    onZoomChange(map, map.getZoom());
  }, [map, onZoomChange]);
  useMapEvents({
    zoomend: (e) => onZoomChange(e.target, e.target.getZoom()),
  });
  return null;
}

const MIN_LABEL_WIDTH_PX = 70;
const MIN_LABEL_HEIGHT_PX = 32;

/** Whether a boundary renders large enough at the given zoom to comfortably fit a
 *  centered name label without it overflowing the shape or crowding its neighbors —
 *  below this, callers should fall back to a plain pin instead. */
function boundaryFitsLabel(map: L.Map, boundary: GeoJsonObject, zoom: number): boolean {
  try {
    const bounds = L.geoJSON(boundary).getBounds();
    if (!bounds.isValid()) return false;
    const ne = map.project(bounds.getNorthEast(), zoom);
    const sw = map.project(bounds.getSouthWest(), zoom);
    return Math.abs(ne.x - sw.x) >= MIN_LABEL_WIDTH_PX && Math.abs(sw.y - ne.y) >= MIN_LABEL_HEIGHT_PX;
  } catch {
    return false;
  }
}

// ── Main widget ───────────────────────────────────────────────────────────────

interface ExploreMapWidgetProps {
  countries: CountryEntry[];
  citiesInCountry: CityEntry[];
  selectedCountry: string | null;
  selectedCity: string | null;
  cities: CityEntry[];
  attractions: Attraction[];
  onCountryClick: (country: CountryEntry) => void;
  onCityClick: (city: CityEntry) => void;
  onAttractionClick: (attraction: Attraction) => void;
  mapRef: MutableRefObject<MapHandle | null>;
}

export function ExploreMapWidget({
  countries,
  citiesInCountry,
  selectedCountry,
  selectedCity,
  cities,
  attractions,
  onCountryClick,
  onCityClick,
  onAttractionClick,
  mapRef,
}: ExploreMapWidgetProps) {
  const { findType } = useAttractionTypes();

  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [mapZoom, setMapZoom] = useState(2);
  const handleZoomChange = useCallback((map: L.Map, zoom: number) => {
    setMapInstance(map);
    setMapZoom(zoom);
  }, []);

  const [cityBoundary, setCityBoundary] = useState<GeoJsonObject | null>(null);
  // Keyed by country name; populated in parallel when the countries list loads
  const [countryBoundaries, setCountryBoundaries] = useState<Map<string, GeoJsonObject | null>>(
    new Map()
  );
  // Keyed by city name; populated in parallel when the country-view city list loads
  const [cityBoundariesInCountry, setCityBoundariesInCountry] = useState<Map<string, GeoJsonObject | null>>(
    new Map()
  );

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

  useEffect(() => {
    if (citiesInCountry.length === 0) return;
    citiesInCountry.forEach((city) => {
      getCityBoundary(city.name, city.country)
        .then((data) =>
          setCityBoundariesInCountry((prev) => new Map(prev).set(city.name, data as GeoJsonObject | null))
        )
        .catch(() =>
          setCityBoundariesInCountry((prev) => new Map(prev).set(city.name, null))
        );
    });
  }, [citiesInCountry]);

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
      <ZoomWatcher onZoomChange={handleZoomChange} />

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

      {/* ── Country view: real boundary or circle fallback + city pins ── */}
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
      {view === "country" &&
        citiesInCountry.map((city, i) => {
          const boundary = cityBoundariesInCountry.get(city.name) ?? null;
          const color = colorForBoundaryIndex(i);
          const fitsLabel = boundary && mapInstance ? boundaryFitsLabel(mapInstance, boundary, mapZoom) : false;

          // With a real boundary that renders large enough at the current zoom, the
          // city name is labeled directly inside the shape (a permanent centered
          // tooltip) instead of a pin. Falls back to a pin both when no boundary
          // resolved AND when the boundary is too small to fit a label without
          // overflowing/crowding its neighbors.
          if (boundary && fitsLabel) {
            return (
              <GeoJSONLayer
                key={city.name}
                data={boundary}
                style={() => ({
                  color,
                  fillColor: color,
                  fillOpacity: 0.25,
                  weight: 2.5,
                  opacity: 1,
                })}
                onEachFeature={(_, layer) =>
                  layer.bindTooltip(city.name, {
                    permanent: true,
                    direction: "center",
                    className: styles.cityBoundaryLabel,
                  })
                }
                eventHandlers={{ click: () => onCityClick(city) }}
              />
            );
          }

          return (
            <Marker
              key={`pin-${city.name}`}
              position={[city.lat, city.lng]}
              icon={makeCityMarkerIcon()}
              eventHandlers={{ click: () => onCityClick(city) }}
            >
              <Tooltip direction="top" offset={[0, -20]}>
                <strong>{city.name}</strong>
                {" · "}{city.count} attraction{city.count !== 1 ? "s" : ""}
              </Tooltip>
            </Marker>
          );
        })}

      {/* ── City view: city boundary (real polygon or 8 km fallback) ── */}
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
      {view === "city" &&
        attractions.map((a) => {
          if (!a.coordinates) return null;
          const typeRecord = findType(a.types?.[0] ?? "");
          const color    = typeRecord?.color   ?? "#64748B";
          const iconName = typeRecord?.icon    ?? "MapPin";
          return (
            <Marker
              key={a._id}
              position={[a.coordinates.lat, a.coordinates.lng]}
              icon={makeAttractionMarkerIcon(color, iconName)}
              eventHandlers={{ click: () => onAttractionClick(a) }}
            >
              <Tooltip direction="top" offset={[0, -17]}>
                <strong>{a.name}</strong>
                {a.types?.[0] ? ` · ${a.types[0]}` : ""}
              </Tooltip>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
