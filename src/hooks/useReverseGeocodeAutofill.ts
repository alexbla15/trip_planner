"use client";

import { useCallback } from "react";
import { reverseGeocode } from "@/services";
import type { Coordinates } from "@/components/NewAttractionModal";

interface UseReverseGeocodeAutofillParams {
  name: string;
  city: string;
  onCoordinates: (coords: Coordinates) => void;
  onNameResolved: (name: string) => void;
  onCityResolved: (city: string) => void;
}

/**
 * Returns a map-picker `onChange` handler that reverse-geocodes the dropped point and
 * auto-fills name/city only while those fields are still empty. Best-effort — a failed
 * lookup silently leaves the fields untouched rather than surfacing an error.
 */
export function useReverseGeocodeAutofill({
  name,
  city,
  onCoordinates,
  onNameResolved,
  onCityResolved,
}: UseReverseGeocodeAutofillParams) {
  return useCallback(
    async (coords: Coordinates) => {
      onCoordinates(coords);
      try {
        const data = (await reverseGeocode(coords.lat, coords.lng)) as {
          name?: string;
          address?: { city?: string; town?: string; municipality?: string; village?: string };
        };
        if (!name.trim() && data.name) onNameResolved(data.name);
        if (!city.trim()) {
          const resolvedCity =
            data.address?.city ?? data.address?.town ?? data.address?.municipality ?? data.address?.village ?? "";
          if (resolvedCity) onCityResolved(resolvedCity);
        }
      } catch {
        // Reverse geocoding is best-effort — silently ignore failures
      }
    },
    [name, city, onCoordinates, onNameResolved, onCityResolved],
  );
}
