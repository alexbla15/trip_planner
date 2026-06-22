"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Search } from "lucide-react";
import type { Coordinates } from "./attraction.types";
import styles from "./MapPicker.module.css";
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

const MAP_CENTER: [number, number] = [48.8566, 2.3522];

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface LeafletMapWidgetProps {
  coordinates: Coordinates | null;
  onChange: (coords: Coordinates) => void;
}

function MapClickHandler({ onChange }: { onChange: (c: Coordinates) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapPanController({ target }: { target: Coordinates | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView([target.lat, target.lng], 14);
  }, [target, map]);
  return null;
}

async function geocode(query: string): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  return res.json();
}

export function LeafletMapWidget({ coordinates, onChange }: LeafletMapWidgetProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [panTarget, setPanTarget] = useState<Coordinates | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        setSuggestions(await geocode(val));
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  function handleSelectSuggestion(result: NominatimResult) {
    const coords: Coordinates = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    onChange(coords);
    setPanTarget(coords);
    setQuery(result.display_name.split(",").slice(0, 2).join(", ").trim());
    setSuggestions([]);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setSuggestions([]);
  }

  return (
    <>
      <div className={styles.searchWrapper}>
        <Search size={14} aria-hidden="true" className={styles.searchIconEl} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search for a location…"
          className={styles.searchInput}
          aria-label="Search for a location"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          autoComplete="off"
        />
        {searching && <span className={styles.searchSpinner} aria-label="Searching…" />}
        {suggestions.length > 0 && (
          <ul ref={listRef} className={styles.suggestions} role="listbox" aria-label="Location suggestions">
            {suggestions.map((r, i) => (
              <li key={i} role="option" aria-selected={false}>
                <button
                  type="button"
                  className={styles.suggestionItem}
                  onClick={() => handleSelectSuggestion(r)}
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MapContainer
        center={coordinates ? [coordinates.lat, coordinates.lng] : MAP_CENTER}
        zoom={coordinates ? 13 : 3}
        className={styles.mapContainer}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapClickHandler onChange={onChange} />
        <MapPanController target={panTarget} />
        {coordinates && (
          <Marker position={[coordinates.lat, coordinates.lng]} />
        )}
      </MapContainer>
    </>
  );
}
