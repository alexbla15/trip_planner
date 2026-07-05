"use client";

import { renderTypeIcon } from "@/lib/attractionIcons";
import styles from "./AttractionTypeChip.module.css";

// Re-export for components that still need an accommodation fallback icon
export { BedDouble as ACCOMMODATION_ICON } from "lucide-react";

/** Static icon map — covers all built-in attraction types.
 *  New types added via the admin panel won't appear here; use renderTypeIcon(findType(t)?.icon) instead. */
const TYPE_ICON_NAMES: Record<string, string> = {
  Restaurant: "Utensils", Bar: "Wine", Café: "Coffee",
  Supermarket: "ShoppingCart", "Food Truck": "Truck",
  Museum: "Building2", Gallery: "ImageIcon", Theatre: "Ticket",
  Religious: "Church", Landmark: "Landmark",
  Park: "TreePine", Beach: "Waves", Zoo: "Footprints", Hiking: "Mountain",
  Cinema: "Clapperboard", Concert: "Mic2", Casino: "Dices",
  "Amusement Park": "FerrisWheel", "Water Park": "Droplets",
  "Escape Room": "KeyRound", "Stand-Up Comedy": "Mic", Nightclub: "Music",
  Mall: "Store", Store: "ShoppingBag", Market: "Tent",
  Spa: "Sparkles", Gym: "Dumbbell", Pool: "Droplet",
  Flight: "Plane", Train: "TrainFront", "Car Rental": "Car",
  "Cruise / Port": "Ship", Bus: "BusFront", "Taxi / Rideshare": "CarFront",
  Hotel: "Hotel", Apartment: "Building", Hostel: "BedDouble", Villa: "Home",
};

export const ICONS: Record<string, React.ReactNode> = Object.fromEntries(
  Object.entries(TYPE_ICON_NAMES).map(([k, v]) => [k, renderTypeIcon(v)])
);

interface AttractionTypeChipProps {
  type: string;
  iconName: string;
  selected: boolean;
  onToggle: (type: string) => void;
}

export function AttractionTypeChip({ type, iconName, selected, onToggle }: AttractionTypeChipProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
      onClick={() => onToggle(type)}
    >
      {renderTypeIcon(iconName)}
      {type}
    </button>
  );
}
