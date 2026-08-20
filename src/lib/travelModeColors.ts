import type { TravelMode } from "@/services";

/** Route/leg color per travel mode — shared between the Explore measure tool and the
 *  Trip Day map's route rendering so the same mode always reads as the same color. */
export const TRAVEL_MODE_COLORS: Record<TravelMode, string> = {
  walk: "#0EA5E9",
  car: "#F59E0B",
  transit: "#8B5CF6",
};

/** Neutral color for a route leg whose distance/duration hasn't resolved yet. */
export const PENDING_ROUTE_COLOR = "#94A3B8";
