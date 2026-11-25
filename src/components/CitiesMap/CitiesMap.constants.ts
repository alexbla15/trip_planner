import type { PathOptions } from "leaflet";
import styles from "./CitiesMap.module.css";

// Colours come from CitiesMap.module.css so they follow the theme; these objects carry
// only the geometry and opacity, plus the class that paints the stroke and fill.

/** Selected-country outline. */
export const COUNTRY_BOUNDARY_STYLE: PathOptions = {
  className: styles.countryBoundary,
  fillOpacity: 0.12,
  weight: 2.5,
  opacity: 1,
};

/** Resolved city boundary polygon outline. */
export const CITY_BOUNDARY_STYLE: PathOptions = {
  className: styles.cityBoundary,
  fillOpacity: 0.25,
  weight: 2.5,
  opacity: 1,
};

/** City marker once its boundary has resolved (falls back to a circle when no polygon exists). */
export const CITY_MARKER_STYLE: PathOptions = {
  className: styles.cityMarker,
  fillOpacity: 0.7,
  weight: 1.5,
};

/** City marker while its boundary lookup is still in flight. */
export const CITY_MARKER_LOADING_STYLE: PathOptions = {
  className: styles.cityMarkerLoading,
  fillOpacity: 0.5,
  weight: 1.5,
};
