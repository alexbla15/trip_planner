"use client";

import { useEffect, useState, useMemo, type MutableRefObject } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, Circle, GeoJSON as GeoJSONLayer, useMap } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Globe, MapPin } from "lucide-react";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";
import { getIconComponent } from "@/components/IconPicker";
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

// ── Icon helpers ──────────────────────────────────────────────────────────────

function makeCountryMarkerIcon(): L.DivIcon {
  let svg = "";
  try { svg = renderToStaticMarkup(<Globe size={16} color="#ffffff" aria-hidden="true" />); } catch { /* */ }
  return L.divIcon({
    html: `<div style="width:40px;height:40px;border-radius:50%;background:#0284C7;border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;cursor:pointer">${svg}</div>`,
    iconSize: [40, 40] as [number, number],
    iconAnchor: [20, 20] as [number, number],
    className: "",
  });
}

function makeCityMarkerIcon(): L.DivIcon {
  let svg = "";
  try { svg = renderToStaticMarkup(<MapPin size={16} color="#ffffff" aria-hidden="true" />); } catch { /* */ }
  return L.divIcon({
    html: `<div style="width:36px;height:36px;border-radius:50%;background:#059669;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer">${svg}</div>`,
    iconSize: [36, 36] as [number, number],
    iconAnchor: [18, 18] as [number, number],
    className: "",
  });
}

function makeAttractionMarkerIcon(color: string, iconName: string): L.DivIcon {
  let svg = "";
  try {
    const IconComp = getIconComponent(iconName);
    svg = renderToStaticMarkup(<IconComp size={14} color="#ffffff" aria-hidden="true" />);
  } catch { /* */ }
  return L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center">${svg}</div>`,
    iconSize: [30, 30] as [number, number],
    iconAnchor: [15, 15] as [number, number],
    className: "",
  });
}

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

  const [cityBoundary, setCityBoundary] = useState<GeoJsonObject | null>(null);
  // Keyed by country name; populated in parallel when the countries list loads
  const [countryBoundaries, setCountryBoundaries] = useState<Map<string, GeoJsonObject | null>>(
    new Map()
  );

  useEffect(() => {
    if (countries.length === 0) return;
    countries.forEach((c) => {
      fetch(`/api/geo/country?name=${encodeURIComponent(c.name)}`)
        .then((r) => r.json())
        .then((data: GeoJsonObject | null) =>
          setCountryBoundaries((prev) => new Map(prev).set(c.name, data))
        )
        .catch(() =>
          setCountryBoundaries((prev) => new Map(prev).set(c.name, null))
        );
    });
  }, [countries]);

  useEffect(() => {
    if (!selectedCity) { setCityBoundary(null); return; }
    const params = new URLSearchParams({ name: selectedCity });
    if (selectedCountry) params.set("country", selectedCountry);
    fetch(`/api/geo/city?${params}`)
      .then((r) => r.json())
      .then((data: GeoJsonObject | null) => setCityBoundary(data))
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

      {/* ── World view: real country polygon (or circle while loading) + pin ── */}
      {view === "world" &&
        countries.map((country) => {
          const boundary = countryBoundaries.get(country.name) ?? null;
          const tooltipLabel = `<strong>${country.name}</strong> · ${country.count} attraction${country.count !== 1 ? "s" : ""}`;
          return boundary ? (
            <GeoJSONLayer
              key={country.name}
              data={boundary}
              style={() => ({
                color: "#0369A1",
                fillColor: "#38BDF8",
                fillOpacity: 0.18,
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
                color: "#0369A1",
                fillColor: "#38BDF8",
                fillOpacity: 0.18,
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
        citiesInCountry.map((city) => (
          <Marker
            key={city.name}
            position={[city.lat, city.lng]}
            icon={makeCityMarkerIcon()}
            eventHandlers={{ click: () => onCityClick(city) }}
          >
            <Tooltip direction="top" offset={[0, -20]}>
              <strong>{city.name}</strong>
              {" · "}{city.count} attraction{city.count !== 1 ? "s" : ""}
            </Tooltip>
          </Marker>
        ))}

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
