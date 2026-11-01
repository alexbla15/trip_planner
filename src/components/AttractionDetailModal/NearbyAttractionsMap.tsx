"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { makeAttractionMarkerIcon } from "@/lib/mapIcons";
import { useAttractionTypes } from "@/hooks";
import { isAttractionPermanentlyClosed } from "@/lib";
import type { Attraction } from "@/types/attraction";

interface NearbyAttractionsMapProps {
  origin: Attraction;
  results: Attraction[];
  onSelect: (attraction: Attraction) => void;
}

/** Re-fits the map bounds whenever the pin set changes (e.g. a fresh search) — without
 *  this, MapContainer only computes bounds once on mount. */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
  }, [map, points]);
  return null;
}

/** Same pin styling/behavior as Explore's map (ExploreMapWidget) — per-type color/icon,
 *  visited border, permanently-closed override, name/type tooltip — so this reads as the
 *  same map the rest of the app already uses, not a bare default-Leaflet-marker view. The
 *  origin attraction (the one "Nearby" was searched from) reuses the same marker with its
 *  `selected` accent border to read as "you are here" without a visually different pin
 *  style breaking that consistency. */
export function NearbyAttractionsMap({ origin, results, onSelect }: NearbyAttractionsMapProps) {
  const { findType } = useAttractionTypes();

  const allPins = origin.coordinates ? [origin, ...results] : results;
  const points: [number, number][] = allPins
    .filter((a) => a.coordinates)
    .map((a) => [a.coordinates!.lat, a.coordinates!.lng] as [number, number]);
  const center = origin.coordinates
    ? ([origin.coordinates.lat, origin.coordinates.lng] as [number, number])
    : points[0];

  function markerFor(a: Attraction, isOrigin: boolean) {
    if (!a.coordinates) return null;
    const typeRecord = findType(a.types?.[0] ?? "");
    const color = typeRecord?.color ?? "#64748B";
    const iconName = typeRecord?.icon ?? "MapPin";
    const permanentlyClosed = isAttractionPermanentlyClosed(a.openingHours, a.seasonalHours);
    return (
      <Marker
        key={a._id}
        position={[a.coordinates.lat, a.coordinates.lng]}
        icon={makeAttractionMarkerIcon(color, iconName, isOrigin, a.isVisited, permanentlyClosed)}
        eventHandlers={isOrigin ? undefined : { click: () => onSelect(a) }}
      >
        <Tooltip direction="top" offset={[0, -17]}>
          <strong>{a.name}</strong>
          {a.types?.[0] ? ` · ${a.types[0]}` : ""}
          {isOrigin ? " · This attraction" : a.distanceKm !== undefined ? ` · ${Math.round(a.distanceKm * 1000)}m away` : ""}
          {permanentlyClosed ? " · Permanently closed" : ""}
          {a.isVisited ? " · Visited" : ""}
        </Tooltip>
      </Marker>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: "100%", width: "100%" }}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} />
      {markerFor(origin, true)}
      {results.map((a) => markerFor(a, false))}
    </MapContainer>
  );
}
