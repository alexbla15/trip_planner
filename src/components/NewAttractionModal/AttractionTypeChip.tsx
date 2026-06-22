"use client";

import {
  Utensils, Wine, Coffee, Building2, Image, TreePine, Waves,
  Landmark, ShoppingBag, Music, Ticket, Sparkles,
} from "lucide-react";
import type { AttractionType } from "./attraction.types";
import styles from "./AttractionTypeChip.module.css";

const ICON_SIZE = 13;

export const ICONS: Record<AttractionType, React.ReactNode> = {
  Restaurant: <Utensils size={ICON_SIZE} aria-hidden="true" />,
  Bar:        <Wine size={ICON_SIZE} aria-hidden="true" />,
  Café:       <Coffee size={ICON_SIZE} aria-hidden="true" />,
  Museum:     <Building2 size={ICON_SIZE} aria-hidden="true" />,
  Gallery:    <Image size={ICON_SIZE} aria-hidden="true" />,
  Park:       <TreePine size={ICON_SIZE} aria-hidden="true" />,
  Beach:      <Waves size={ICON_SIZE} aria-hidden="true" />,
  Landmark:   <Landmark size={ICON_SIZE} aria-hidden="true" />,
  Shopping:   <ShoppingBag size={ICON_SIZE} aria-hidden="true" />,
  Nightclub:  <Music size={ICON_SIZE} aria-hidden="true" />,
  Theatre:    <Ticket size={ICON_SIZE} aria-hidden="true" />,
  Spa:        <Sparkles size={ICON_SIZE} aria-hidden="true" />,
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
