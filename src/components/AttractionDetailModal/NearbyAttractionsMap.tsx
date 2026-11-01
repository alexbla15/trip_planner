"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Attraction } from "@/types/attraction";

/* eslint-disable @typescript-eslint/no-explicit-any */
delete (L.Icon.Default.prototype as any)._getIconUrl;
/* eslint-enable @typescript-eslint/no-explicit-any */
L.Icon.Default.mergeOptions({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// A visually distinct pin for the attraction the search was run from, so it reads as
// "you are here" rather than just another result in the list.
const originIcon = new L.Icon({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [49, 49],
  className: "nearby-origin-marker",
});

interface NearbyAttractionsMapProps {
  origin: { lat: number; lng: number; name: string };
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

export function NearbyAttractionsMap({ origin, results, onSelect }: NearbyAttractionsMapProps) {
  const points: [number, number][] = [
    [origin.lat, origin.lng],
    ...results.filter((a) => a.coordinates).map((a) => [a.coordinates!.lat, a.coordinates!.lng] as [number, number]),
  ];

  return (
    <MapContainer
      center={[origin.lat, origin.lng]}
      zoom={15}
      style={{ height: "100%", width: "100%" }}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} />
      <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
        <Popup>{origin.name}</Popup>
      </Marker>
      {results.map((a) =>
        a.coordinates ? (
          <Marker
            key={a._id}
            position={[a.coordinates.lat, a.coordinates.lng]}
            eventHandlers={{ click: () => onSelect(a) }}
          >
            <Popup>
              <strong>{a.name}</strong>
              {a.distanceKm !== undefined && <div>{Math.round(a.distanceKm * 1000)} m away</div>}
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}
