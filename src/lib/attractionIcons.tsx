"use client";

import type { LucideIcon } from "lucide-react";
import {
  // Type-chip icons (per attraction type)
  Utensils, Wine, Coffee, ShoppingCart, Truck, Building2,
  ImageIcon, Ticket, Church, Landmark, TreePine, Waves,
  Footprints, Mountain, Clapperboard, Mic2, Dices, FerrisWheel,
  Droplets, KeyRound, Mic, Music, Store, ShoppingBag, Tent,
  Sparkles, Dumbbell, Droplet, Plane, TrainFront, Car, Ship,
  BusFront, CarFront, Hotel, Building, BedDouble, Home,
  // Category-header icons
  UtensilsCrossed, Globe, Heart, Gem, Anchor,
  // Fallback
  Circle,
} from "lucide-react";

/** All Lucide icons available for use with attraction types. */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  // --- Type-chip icons ---
  Utensils,
  Wine,
  Coffee,
  ShoppingCart,
  Truck,
  Building2,
  ImageIcon,
  Ticket,
  Church,
  Landmark,
  TreePine,
  Waves,
  Footprints,
  Mountain,
  Clapperboard,
  Mic2,
  Dices,
  FerrisWheel,
  Droplets,
  KeyRound,
  Mic,
  Music,
  Store,
  ShoppingBag,
  Tent,
  Sparkles,
  Dumbbell,
  Droplet,
  Plane,
  TrainFront,
  Car,
  Ship,
  BusFront,
  CarFront,
  Hotel,
  Building,
  BedDouble,
  Home,
  // --- Category-header icons ---
  UtensilsCrossed,
  Globe,
  Heart,
  Gem,
  Anchor,
};

/** Sorted list of all valid icon names for admin dropdowns. */
export const ICON_NAMES: string[] = Object.keys(ICON_REGISTRY).sort();

/** Returns the LucideIcon component for a given name, falling back to Circle. */
export function getIconComponent(name: string): LucideIcon {
  return ICON_REGISTRY[name] ?? Circle;
}

/** Returns a sized React element for use in type chips and lists. */
export function renderTypeIcon(iconName: string, size = 13): React.ReactNode {
  const Icon = getIconComponent(iconName);
  return <Icon size={size} aria-hidden="true" />;
}
