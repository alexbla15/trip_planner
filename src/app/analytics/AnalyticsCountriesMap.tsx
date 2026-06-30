"use client";

import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons broken by webpack asset fingerprinting in Next.js
/* eslint-disable @typescript-eslint/no-explicit-any */
delete (L.Icon.Default.prototype as any)._getIconUrl;
/* eslint-enable @typescript-eslint/no-explicit-any */
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const GEOJSON_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

// Maps our app's country names (from attraction.constants.ts COUNTRIES list) to the
// matching feature name in the geo-countries GeoJSON dataset, where they differ.
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  "united states": "united states of america",
  "congo (brazzaville)": "republic of the congo",
  "congo (kinshasa)": "democratic republic of the congo",
  "czech republic": "czechia",
  "tanzania": "united republic of tanzania",
  "vatican city": "vatican",
  "timor-leste": "east timor",
  "micronesia": "federated states of micronesia",
  "são tomé and príncipe": "são tomé and principe",
};

interface AnalyticsCountriesMapProps {
  countries: Array<{ _id: string; count: number }>;
}

export function AnalyticsCountriesMap({ countries }: AnalyticsCountriesMapProps) {
  const [geoJson, setGeoJson] = useState<object | null>(null);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((r) => r.json())
      .then(setGeoJson)
      .catch(() => {});
  }, []);

  const countMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of countries) {
      const key = c._id.toLowerCase();
      map[COUNTRY_NAME_ALIASES[key] ?? key] = c.count;
    }
    return map;
  }, [countries]);

  const maxCount = useMemo(
    () => Math.max(1, ...countries.map((c) => c.count)),
    [countries]
  );

  function getStyle(feature: GeoJSON.Feature | undefined): L.PathOptions {
    const name = (feature?.properties?.name ?? "") as string;
    const count = countMap[name.toLowerCase()];
    if (count) {
      const opacity = 0.25 + (count / maxCount) * 0.55;
      return {
        fillColor: "#0EA5E9",
        fillOpacity: opacity,
        color: "#ffffff",
        weight: 0.5,
        opacity: 0.6,
      };
    }
    return {
      fillColor: "#E2E8F0",
      fillOpacity: 0.6,
      color: "#CBD5E1",
      weight: 0.5,
      opacity: 0.5,
    };
  }

  function onEachFeature(feature: GeoJSON.Feature, layer: L.Layer) {
    const name = (feature?.properties?.name ?? "") as string;
    const count = countMap[name.toLowerCase()];
    if (count) {
      (layer as L.Path).bindTooltip(
        `${name}: ${count.toLocaleString()} attractions`,
        { sticky: true }
      );
    }
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
      zoomControl
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {geoJson && (
        <GeoJSON
          key={countries.map((c) => c._id).join(",")}
          data={geoJson as GeoJSON.GeoJsonObject}
          style={getStyle}
          onEachFeature={onEachFeature}
        />
      )}
    </MapContainer>
  );
}
