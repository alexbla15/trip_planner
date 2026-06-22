"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { Coordinates } from "./attraction.types";
import styles from "./MapPicker.module.css";

export interface MapPickerProps {
  coordinates: Coordinates | null;
  onChange: (coords: Coordinates) => void;
}

const LeafletMapWidget = dynamic(
  () => import("./LeafletMapWidget").then((m) => ({ default: m.LeafletMapWidget })),
  {
    ssr: false,
    loading: () => <div className={styles.mapLoading} aria-label="Loading map…" />,
  }
);

export function MapPicker({ coordinates, onChange }: MapPickerProps) {
  return (
    <div className={styles.wrapper}>
      <LeafletMapWidget coordinates={coordinates} onChange={onChange} />

      {coordinates && (
        <p className={styles.coordsReadout} aria-live="polite">
          <MapPin size={12} aria-hidden="true" />
          {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
