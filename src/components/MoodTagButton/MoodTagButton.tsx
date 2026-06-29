"use client";

import {
  Moon, Landmark, Mountain, Waves, UtensilsCrossed,
  Gem, Sparkles, Heart, Users, Backpack, Anchor,
} from "lucide-react";
import { TAG_CLASS_MAP } from "@/components/MoodTagChip/MoodTagChip.constants";
import styles from "./MoodTagButton.module.css";

const ICON_SIZE = 13;

const MOOD_ICONS: Record<string, React.ReactNode> = {
  "Vibrant Nightlife":    <Moon size={ICON_SIZE} aria-hidden="true" />,
  "Cultural Heritage":    <Landmark size={ICON_SIZE} aria-hidden="true" />,
  "Adventure":            <Mountain size={ICON_SIZE} aria-hidden="true" />,
  "Beach Life":           <Waves size={ICON_SIZE} aria-hidden="true" />,
  "Food & Wine":          <UtensilsCrossed size={ICON_SIZE} aria-hidden="true" />,
  "Luxury":               <Gem size={ICON_SIZE} aria-hidden="true" />,
  "Relaxation & Wellness":<Sparkles size={ICON_SIZE} aria-hidden="true" />,
  "Couples & Romantic":   <Heart size={ICON_SIZE} aria-hidden="true" />,
  "Family":               <Users size={ICON_SIZE} aria-hidden="true" />,
  "Backpacking & Budget": <Backpack size={ICON_SIZE} aria-hidden="true" />,
  "Cruises":              <Anchor size={ICON_SIZE} aria-hidden="true" />,
};

interface MoodTagButtonProps {
  tag: string;
  selected: boolean;
  onToggle: (tag: string) => void;
}

export function MoodTagButton({ tag, selected, onToggle }: MoodTagButtonProps) {
  const tagClass = TAG_CLASS_MAP[tag] ?? "tagLuxury";

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      className={[
        styles.moodBtn,
        styles[tagClass],
        selected ? styles.moodBtnSelected : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onToggle(tag)}
    >
      {MOOD_ICONS[tag]}
      {tag}
    </button>
  );
}
