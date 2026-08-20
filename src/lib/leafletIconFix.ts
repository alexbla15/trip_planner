import L from "leaflet";

/**
 * Webpack asset fingerprinting breaks Leaflet's default marker icon URLs in Next.js.
 * Deletes the broken auto-detection method and points the default icon at the CDN
 * images instead. Call once at module scope in any file that renders a Leaflet map.
 */
export function fixLeafletDefaultIcon(): void {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}
