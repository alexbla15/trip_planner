import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Utensils, Wine, Coffee, ShoppingCart, Truck, Building2,
  ImageIcon, Ticket, Church, Landmark, TreePine, Waves,
  Footprints, Mountain, Clapperboard, Mic2, Dices, FerrisWheel,
  Droplets, KeyRound, Mic, Music, Store, ShoppingBag, Tent,
  Sparkles, Dumbbell, Droplet, Plane, TrainFront, Car, Ship,
  BusFront, CarFront, Hotel, Building, BedDouble, Home,
  Archive, Luggage,
  UtensilsCrossed, Globe, Heart, Gem, Anchor,
  Moon, Users, Backpack, Camera,
  Circle,
} from "lucide-react";

export const ICON_REGISTRY: Record<string, LucideIcon> = {
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
  Archive,
  Luggage,
  UtensilsCrossed,
  Globe,
  Heart,
  Gem,
  Anchor,
  Moon,
  Users,
  Backpack,
  Camera,
};

export const ICON_NAMES: string[] = Object.keys(ICON_REGISTRY).sort();

export function getIconComponent(name: string): LucideIcon {
  return ICON_REGISTRY[name] ?? Circle;
}

export function renderTypeIcon(iconName: string, size = 13): React.ReactNode {
  const Icon = getIconComponent(iconName);
  return <Icon size={size} aria-hidden="true" />;
}

