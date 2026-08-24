import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { MapPin, Building2 } from "lucide-react";
import { getIconComponent } from "@/components/IconPicker";
import {
  MARKER_ICON_WHITE,
  COUNTRY_MARKER_COLOR,
  ACCENT_MARKER_COLOR,
  VISITED_BORDER_COLOR,
  ATTRACTION_MARKER_SIZE_PX,
  CUSTOM_PIN_SIZE_PX,
  CITY_MARKER_SIZE_PX,
} from "./mapIcons.constants";

export function makeAttractionMarkerIcon(color: string, iconName: string, selected = false, isVisited = false): L.DivIcon {
  let svg = "";
  try {
    const IconComp = getIconComponent(iconName);
    svg = renderToStaticMarkup(<IconComp size={14} color={MARKER_ICON_WHITE} aria-hidden="true" />);
  } catch { /* */ }
  // Measure-tool selection outranks visited status (it's a temporary, in-the-moment
  // state); visited status gets its own border color (--color-success) so a marked
  // place stays visually distinguishable from unvisited ones at a glance.
  const border = selected
    ? `3px solid ${ACCENT_MARKER_COLOR}`
    : isVisited
      ? `3px solid ${VISITED_BORDER_COLOR}`
      : "2px solid #fff";
  return L.divIcon({
    html: `<div style="width:${ATTRACTION_MARKER_SIZE_PX}px;height:${ATTRACTION_MARKER_SIZE_PX}px;border-radius:50%;background:${color};border:${border};box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center">${svg}</div>`,
    iconSize: [ATTRACTION_MARKER_SIZE_PX, ATTRACTION_MARKER_SIZE_PX] as [number, number],
    iconAnchor: [ATTRACTION_MARKER_SIZE_PX / 2, ATTRACTION_MARKER_SIZE_PX / 2] as [number, number],
    className: "",
  });
}

// Aggregate pin for a city's worth of attractions, shown in country view when zoomed
// out past CITY_PIN_ZOOM_THRESHOLD (see ExploreMapWidget.tsx) — square (vs. every
// other marker's circle) so it reads as "not an individual place" at a glance, with
// a count badge instead of an per-attraction pin flood.
export function makeCityMarkerIcon(count: number): L.DivIcon {
  let svg = "";
  try { svg = renderToStaticMarkup(<Building2 size={16} color={MARKER_ICON_WHITE} aria-hidden="true" />); } catch { /* */ }
  return L.divIcon({
    html: `<div style="position:relative;width:${CITY_MARKER_SIZE_PX}px;height:${CITY_MARKER_SIZE_PX}px;border-radius:6px;background:${COUNTRY_MARKER_COLOR};border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;cursor:pointer">${svg}<div style="position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;padding:0 3px;border-radius:50%;background:#fff;color:${COUNTRY_MARKER_COLOR};font-size:10px;font-weight:700;font-family:inherit;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3)">${count}</div></div>`,
    iconSize: [CITY_MARKER_SIZE_PX, CITY_MARKER_SIZE_PX] as [number, number],
    iconAnchor: [CITY_MARKER_SIZE_PX / 2, CITY_MARKER_SIZE_PX / 2] as [number, number],
    className: "",
  });
}

// Ad-hoc "measure distance" pin dropped by the user on Explore — distinct from the
// permanent country/city/attraction pins, uses the design system's accent color.
export function makeCustomPinIcon(): L.DivIcon {
  let svg = "";
  try { svg = renderToStaticMarkup(<MapPin size={16} color={MARKER_ICON_WHITE} aria-hidden="true" />); } catch { /* */ }
  return L.divIcon({
    html: `<div style="width:${CUSTOM_PIN_SIZE_PX}px;height:${CUSTOM_PIN_SIZE_PX}px;border-radius:50%;background:${ACCENT_MARKER_COLOR};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer">${svg}</div>`,
    iconSize: [CUSTOM_PIN_SIZE_PX, CUSTOM_PIN_SIZE_PX] as [number, number],
    iconAnchor: [CUSTOM_PIN_SIZE_PX / 2, CUSTOM_PIN_SIZE_PX / 2] as [number, number],
    className: "",
  });
}
