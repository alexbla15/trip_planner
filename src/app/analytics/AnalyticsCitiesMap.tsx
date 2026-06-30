"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
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

export interface CityWithCoords {
  _id: string;
  count: number;
  country?: string;
  lat: number;
  lng: number;
}

interface AnalyticsCitiesMapProps {
  cities: CityWithCoords[];
}

export function AnalyticsCitiesMap({ cities }: AnalyticsCitiesMapProps) {
  const maxCount = Math.max(1, ...cities.map((c) => c.count));

  const bounds = useMemo(
    () => L.latLngBounds(cities.map((c) => [c.lat, c.lng] as [number, number])),
    [cities]
  );

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [40, 40] }}
      style={{ height: "100%", width: "100%" }}
      zoomControl
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {cities.map((city) => {
        const radius = 4 + (city.count / maxCount) * 14;
        return (
          <CircleMarker
            key={city._id}
            center={[city.lat, city.lng]}
            radius={radius}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#0EA5E9",
              fillOpacity: 0.85,
              weight: 1.5,
            }}
          >
            <Tooltip>
              <strong>{city._id}</strong>
              {city.country ? `, ${city.country}` : ""}
              {" · "}{city.count.toLocaleString()} attractions
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
