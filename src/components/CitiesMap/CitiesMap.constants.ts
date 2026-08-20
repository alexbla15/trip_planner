import type { PathOptions } from "leaflet";

/** Selected-country outline — amber, matches the design system's accent hue. */
export const COUNTRY_BOUNDARY_STYLE: PathOptions = {
  color: "#B45309",
  fillColor: "#F59E0B",
  fillOpacity: 0.12,
  weight: 2.5,
  opacity: 1,
};

/** Resolved city boundary polygon outline — sky, matches the design system's primary hue. */
export const CITY_BOUNDARY_STYLE: PathOptions = {
  color: "#0369A1",
  fillColor: "#38BDF8",
  fillOpacity: 0.25,
  weight: 2.5,
  opacity: 1,
};

/** City marker once its boundary has resolved (falls back to a circle when no polygon exists). */
export const CITY_MARKER_STYLE: PathOptions = {
  color: "#0369A1",
  fillColor: "#38BDF8",
  fillOpacity: 0.7,
  weight: 1.5,
};

/** City marker while its boundary lookup is still in flight — neutral slate. */
export const CITY_MARKER_LOADING_STYLE: PathOptions = {
  color: "#94A3B8",
  fillColor: "#CBD5E1",
  fillOpacity: 0.5,
  weight: 1.5,
};
