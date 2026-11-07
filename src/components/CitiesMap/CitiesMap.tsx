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
import { getCityBoundary, getCountryBoundary } from "@/services";
import { fixLeafletDefaultIcon } from "@/lib/leafletIconFix";
import {
  COUNTRY_BOUNDARY_STYLE,
  CITY_BOUNDARY_STYLE,
  CITY_MARKER_STYLE,
  CITY_MARKER_LOADING_STYLE,
} from "./CitiesMap.constants";
import "leaflet/dist/leaflet.css";

fixLeafletDefaultIcon();

/** One city's aggregate marker/boundary data. `lat`/`lng` are the centroid used for the
 *  fallback circle marker and map bounds; boundary polygons are fetched separately per
 *  city and may resolve to `null` (falls back to the circle marker) or a fallback
 *  municipality shape flagged via `properties.isFallbackBoundary`. */
export interface CityEntry {
  _id: string;
  count: number;
  country?: string;
  lat?: number;
  lng?: number;
}

interface CitiesMapProps {
  cities: CityEntry[];
  /** When set, also fetches and outlines this country's boundary polygon. */
  selectedCountry?: string;
  /** Singular noun shown in tooltips/labels, e.g. "attraction" → "3 attractions". */
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
      getCityBoundary(city._id, city.country)
        .then((data) =>
          setCityBoundaries((prev) => new Map(prev).set(city._id, data as GeoJsonObject | null)),
        )
        .catch(() =>
          setCityBoundaries((prev) => new Map(prev).set(city._id, null)),
        );
    });
  }, [cities]);

  useEffect(() => {
    if (!selectedCountry) { setCountryBoundary(undefined); return; }
    setCountryBoundary(undefined);
    getCountryBoundary(selectedCountry)
      .then((data) => setCountryBoundary(data as GeoJsonObject | null))
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
          style={() => COUNTRY_BOUNDARY_STYLE}
        />
      )}

      {cities.map((city) => {
        const boundary = cityBoundaries.get(city._id);
        const isLoading = !cityBoundaries.has(city._id);

        if (!isLoading && boundary) {
          const isFallback = (boundary as { properties?: Record<string, unknown> }).properties?.isFallbackBoundary === true;
          const label = `${city.count.toLocaleString()} ${countLabel}${city.count !== 1 ? "s" : ""}`;
          const tooltipHtml =
            `<strong>${city._id}</strong>` +
            (city.country ? `, ${city.country}` : "") +
            ` · ${label}` +
            (isFallback ? ` <em>(approximate — municipality boundary)</em>` : "");
          return (
            <GeoJSONLayer
              key={city._id}
              data={boundary}
              style={() => ({
                ...CITY_BOUNDARY_STYLE,
                dashArray: isFallback ? "6 4" : undefined,
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
              pathOptions={isLoading ? CITY_MARKER_LOADING_STYLE : CITY_MARKER_STYLE}
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
