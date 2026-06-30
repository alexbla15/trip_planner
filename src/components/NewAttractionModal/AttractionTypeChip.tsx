"use client";

import {
  Utensils, Wine, Coffee, Building2, Image, TreePine, Waves,
  Landmark, Music, Ticket, Sparkles, Clapperboard,
  Mic2, Dices, FerrisWheel, Footprints, Church, Hotel as HotelIcon,
  Plane, TrainFront, Car, Ship,
  BusFront, CarFront, Building, BedDouble, Home,
  ShoppingCart, Truck, Mountain, Droplets, KeyRound, Mic,
  Store as StoreIcon, ShoppingBag, Tent, Dumbbell, Droplet,
} from "lucide-react";
import type { AttractionType } from "./attraction.types";
import styles from "./AttractionTypeChip.module.css";

const ICON_SIZE = 13;

export const ICONS: Record<AttractionType, React.ReactNode> = {
  Restaurant:          <Utensils size={ICON_SIZE} aria-hidden="true" />,
  Bar:                 <Wine size={ICON_SIZE} aria-hidden="true" />,
  Café:                <Coffee size={ICON_SIZE} aria-hidden="true" />,
  Supermarket:         <ShoppingCart size={ICON_SIZE} aria-hidden="true" />,
  "Food Truck":        <Truck size={ICON_SIZE} aria-hidden="true" />,
  Museum:              <Building2 size={ICON_SIZE} aria-hidden="true" />,
  Gallery:             <Image size={ICON_SIZE} aria-hidden="true" />,
  Theatre:             <Ticket size={ICON_SIZE} aria-hidden="true" />,
  Religious:           <Church size={ICON_SIZE} aria-hidden="true" />,
  Landmark:            <Landmark size={ICON_SIZE} aria-hidden="true" />,
  Park:                <TreePine size={ICON_SIZE} aria-hidden="true" />,
  Beach:               <Waves size={ICON_SIZE} aria-hidden="true" />,
  Zoo:                 <Footprints size={ICON_SIZE} aria-hidden="true" />,
  Hiking:              <Mountain size={ICON_SIZE} aria-hidden="true" />,
  Cinema:              <Clapperboard size={ICON_SIZE} aria-hidden="true" />,
  Concert:             <Mic2 size={ICON_SIZE} aria-hidden="true" />,
  Casino:              <Dices size={ICON_SIZE} aria-hidden="true" />,
  "Amusement Park":    <FerrisWheel size={ICON_SIZE} aria-hidden="true" />,
  "Water Park":        <Droplets size={ICON_SIZE} aria-hidden="true" />,
  "Escape Room":       <KeyRound size={ICON_SIZE} aria-hidden="true" />,
  "Stand-Up Comedy":   <Mic size={ICON_SIZE} aria-hidden="true" />,
  Nightclub:           <Music size={ICON_SIZE} aria-hidden="true" />,
  Mall:                <StoreIcon size={ICON_SIZE} aria-hidden="true" />,
  Store:               <ShoppingBag size={ICON_SIZE} aria-hidden="true" />,
  Market:              <Tent size={ICON_SIZE} aria-hidden="true" />,
  Spa:                 <Sparkles size={ICON_SIZE} aria-hidden="true" />,
  Gym:                 <Dumbbell size={ICON_SIZE} aria-hidden="true" />,
  Pool:                <Droplet size={ICON_SIZE} aria-hidden="true" />,
  Flight:              <Plane size={ICON_SIZE} aria-hidden="true" />,
  Train:               <TrainFront size={ICON_SIZE} aria-hidden="true" />,
  "Car Rental":        <Car size={ICON_SIZE} aria-hidden="true" />,
  "Cruise / Port":     <Ship size={ICON_SIZE} aria-hidden="true" />,
  "Bus":               <BusFront size={ICON_SIZE} aria-hidden="true" />,
  "Taxi / Rideshare":  <CarFront size={ICON_SIZE} aria-hidden="true" />,
  Hotel:               <HotelIcon size={ICON_SIZE} aria-hidden="true" />,
  "Apartment":         <Building size={ICON_SIZE} aria-hidden="true" />,
  "Hostel":            <BedDouble size={ICON_SIZE} aria-hidden="true" />,
  "Villa":             <Home size={ICON_SIZE} aria-hidden="true" />,
};

interface AttractionTypeChipProps {
  type: AttractionType;
  selected: boolean;
  onToggle: (type: AttractionType) => void;
}

export function AttractionTypeChip({ type, selected, onToggle }: AttractionTypeChipProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
      onClick={() => onToggle(type)}
    >
      {ICONS[type]}
      {type}
    </button>
  );
}
