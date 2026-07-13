"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  GeoJSON as GeoJSONLayer,
  useMap,
} from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* eslint-disable @typescript-eslint/no-explicit-any */
delete (L.Icon.Default.prototype as any)._getIconUrl;
/* eslint-enable @typescript-eslint/no-explicit-any */
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface CityEntry {
  _id: string;
  count: number;
  country?: string;
  lat?: number;
  lng?: number;
}

interface CitiesMapProps {
  cities: CityEntry[];
  selectedCountry?: string;
  countLabel?: string;
}

type BoundaryState = Map<string, GeoJsonObject | null>;

function BoundsUpdater({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], animate: true });
  }, [bounds, map]);
  return null;
}

export function CitiesMap({ cities, selectedCountry, countLabel = "attraction" }: CitiesMapProps) {
  const [cityBoundaries, setCityBoundaries] = useState<BoundaryState>(new Map());
  const [countryBoundary, setCountryBoundary] = useState<GeoJsonObject | null | undefined>(undefined);

  const citiesWithCoords = useMemo(
    () => cities.filter((c): c is CityEntry & { lat: number; lng: number } =>
      c.lat != null && c.lng != null
    ),
    [cities],
  );

  const bounds = useMemo(
    () =>
      citiesWithCoords.length > 0
        ? L.latLngBounds(citiesWithCoords.map((c) => [c.lat, c.lng] as [number, number]))
        : null,
    [citiesWithCoords],
  );

  useEffect(() => {
    setCityBoundaries(new Map());
    cities.forEach((city) => {
      const params = new URLSearchParams({ name: city._id });
      if (city.country) params.set("country", city.country);
      fetch(`/api/geo/city?${params}`)
        .then((r) => r.json())
        .then((data: GeoJsonObject | null) =>
          setCityBoundaries((prev) => new Map(prev).set(city._id, data)),
        )
        .catch(() =>
          setCityBoundaries((prev) => new Map(prev).set(city._id, null)),
        );
    });
  }, [cities]);

  useEffect(() => {
    if (!selectedCountry) { setCountryBoundary(undefined); return; }
    setCountryBoundary(undefined);
    fetch(`/api/geo/country?name=${encodeURIComponent(selectedCountry)}`)
      .then((r) => r.json())
      .then((data: GeoJsonObject | null) => setCountryBoundary(data))
      .catch(() => setCountryBoundary(null));
  }, [selectedCountry]);

  const mapProps = bounds?.isValid()
    ? { bounds, boundsOptions: { padding: [40, 40] as [number, number] } }
    : ({ center: [20, 0] as [number, number], zoom: 3 });

  return (
    <MapContainer
      {...mapProps}
      style={{ height: "100%", width: "100%" }}
      zoomControl
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {bounds?.isValid() && <BoundsUpdater bounds={bounds} />}

      {selectedCountry && countryBoundary && (
        <GeoJSONLayer
          key={selectedCountry}
          data={countryBoundary}
          style={() => ({
            color: "#B45309",
            fillColor: "#F59E0B",
            fillOpacity: 0.12,
            weight: 2.5,
            opacity: 1,
          })}
        />
      )}

      {cities.map((city) => {
        const boundary = cityBoundaries.get(city._id);
        const isLoading = !cityBoundaries.has(city._id);

        if (!isLoading && boundary) {
          const label = `${city.count.toLocaleString()} ${countLabel}${city.count !== 1 ? "s" : ""}`;
          const tooltipHtml =
            `<strong>${city._id}</strong>` +
            (city.country ? `, ${city.country}` : "") +
            ` · ${label}`;
          return (
            <GeoJSONLayer
              key={city._id}
              data={boundary}
              style={() => ({
                color: "#0369A1",
                fillColor: "#38BDF8",
                fillOpacity: 0.25,
                weight: 2.5,
                opacity: 1,
              })}
              onEachFeature={(_, layer) =>
                layer.bindTooltip(tooltipHtml, { direction: "top" })
              }
            />
          );
        }

        if (city.lat != null && city.lng != null) {
          return (
            <CircleMarker
              key={city._id}
              center={[city.lat, city.lng]}
              radius={8}
              pathOptions={
                isLoading
                  ? { color: "#94A3B8", fillColor: "#CBD5E1", fillOpacity: 0.5, weight: 1.5 }
                  : { color: "#0369A1", fillColor: "#38BDF8", fillOpacity: 0.7, weight: 1.5 }
              }
            >
              <Tooltip>
                <strong>{city._id}</strong>
                {city.country ? `, ${city.country}` : ""}
                {" · "}{city.count.toLocaleString()} {countLabel}{city.count !== 1 ? "s" : ""}
              </Tooltip>
            </CircleMarker>
          );
        }

        return null;
      })}
    </MapContainer>
  );
}
