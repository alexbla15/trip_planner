import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Globe, MapPin } from "lucide-react";
import { getIconComponent } from "@/components/IconPicker";

export function makeCountryMarkerIcon(): L.DivIcon {
  let svg = "";
  try { svg = renderToStaticMarkup(<Globe size={16} color="#ffffff" aria-hidden="true" />); } catch { /* */ }
  return L.divIcon({
    html: `<div style="width:40px;height:40px;border-radius:50%;background:#0284C7;border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;cursor:pointer">${svg}</div>`,
    iconSize: [40, 40] as [number, number],
    iconAnchor: [20, 20] as [number, number],
    className: "",
  });
}

export function makeAttractionMarkerIcon(color: string, iconName: string, selected = false, isVisited = false): L.DivIcon {
  let svg = "";
  try {
    const IconComp = getIconComponent(iconName);
    svg = renderToStaticMarkup(<IconComp size={14} color="#ffffff" aria-hidden="true" />);
  } catch { /* */ }
  // Measure-tool selection outranks visited status (it's a temporary, in-the-moment
  // state); visited status gets its own border color (--color-success) so a marked
  // place stays visually distinguishable from unvisited ones at a glance.
  const border = selected ? "3px solid #D97706" : isVisited ? "3px solid #059669" : "2px solid #fff";
  return L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:${border};box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center">${svg}</div>`,
    iconSize: [30, 30] as [number, number],
    iconAnchor: [15, 15] as [number, number],
    className: "",
  });
}

// Ad-hoc "measure distance" pin dropped by the user on Explore — distinct from the
// permanent country/city/attraction pins, uses the design system's accent color.
export function makeCustomPinIcon(): L.DivIcon {
  let svg = "";
  try { svg = renderToStaticMarkup(<MapPin size={16} color="#ffffff" aria-hidden="true" />); } catch { /* */ }
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:#D97706;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer">${svg}</div>`,
    iconSize: [32, 32] as [number, number],
    iconAnchor: [16, 16] as [number, number],
    className: "",
  });
}
