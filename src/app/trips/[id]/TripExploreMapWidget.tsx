"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import { useAttractionTypes } from "@/hooks";
import { makeAttractionMarkerIcon } from "@/lib/mapIcons";
import { fixLeafletDefaultIcon } from "@/lib/leafletIconFix";
import { filterTopLevelMapPins } from "@/lib";
import type { Attraction } from "@/types/attraction";
import styles from "./TripExploreMapWidget.module.css";
import "leaflet/dist/leaflet.css";

fixLeafletDefaultIcon();

interface TripExploreMapWidgetProps {
  attractions: Attraction[];
  onAttractionClick: (attraction: Attraction) => void;
  /** Maps a plannedDate key to a color; undefined falls back to type-based coloring
   *  (single-day trip, or the day filter has been narrowed to one day). */
  dayColors?: Record<string, string>;
  unscheduledColor?: string;
}

// Re-fits the map to the current pin set whenever the filtered attraction list changes,
// so filtering doesn't leave the user staring at a pan/zoom that no longer matches
// what's actually shown.
function BoundsFitter({ attractions }: { attractions: Attraction[] }) {
  const map = useMap();
  const attractionIds = attractions.map((a) => a._id).join(",");

  useEffect(() => {
    const withCoords = attractions.filter((a) => !!a.coordinates);
    if (withCoords.length === 0) return;
    const bounds = withCoords.map((a) => [a.coordinates!.lat, a.coordinates!.lng] as [number, number]);
    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else {
      map.fitBounds(bounds, { padding: [32, 32] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attractionIds, map]);

  return null;
}

export function TripExploreMapWidget({ attractions, onAttractionClick, dayColors, unscheduledColor }: TripExploreMapWidgetProps) {
  const { findType } = useAttractionTypes();
  const withCoords = attractions.filter((a) => !!a.coordinates);
  const initialCenter = useRef<[number, number]>(
    withCoords[0]?.coordinates ? [withCoords[0].coordinates.lat, withCoords[0].coordinates.lng] : [20, 0]
  );

  if (withCoords.length === 0) {
    return (
      <div className={styles.emptyState}>
        No attractions with a location match the current filters.
      </div>
    );
  }

  return (
    <div className={styles.mapContainer}>
      <MapContainer center={initialCenter.current} zoom={12} scrollWheelZoom className={styles.map}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <BoundsFitter attractions={withCoords} />
        {filterTopLevelMapPins(withCoords).map((a) => {
          const typeRecord = findType(a.types?.[0] ?? "");
          const color = dayColors
            ? dayColors[a.plannedDate ?? ""] ?? unscheduledColor ?? "#64748B"
            : typeRecord?.color ?? "#64748B";
          const iconName = typeRecord?.icon ?? "MapPin";
          return (
            <Marker
              key={a._id}
              position={[a.coordinates!.lat, a.coordinates!.lng]}
              icon={makeAttractionMarkerIcon(color, iconName, false, a.isVisited)}
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
    </div>
  );
}
