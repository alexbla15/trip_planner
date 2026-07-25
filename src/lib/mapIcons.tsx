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

export function makeCityMarkerIcon(): L.DivIcon {
  let svg = "";
  try { svg = renderToStaticMarkup(<MapPin size={16} color="#ffffff" aria-hidden="true" />); } catch { /* */ }
  return L.divIcon({
    html: `<div style="width:36px;height:36px;border-radius:50%;background:#059669;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer">${svg}</div>`,
    iconSize: [36, 36] as [number, number],
    iconAnchor: [18, 18] as [number, number],
    className: "",
  });
}

export function makeAttractionMarkerIcon(color: string, iconName: string): L.DivIcon {
  let svg = "";
  try {
    const IconComp = getIconComponent(iconName);
    svg = renderToStaticMarkup(<IconComp size={14} color="#ffffff" aria-hidden="true" />);
  } catch { /* */ }
  return L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center">${svg}</div>`,
    iconSize: [30, 30] as [number, number],
    iconAnchor: [15, 15] as [number, number],
    className: "",
  });
}
