"use client";

import { Gem, Camera, Disc3, Landmark, Mountain, Waves, UtensilsCrossed } from "lucide-react";
import { TAG_CLASS_MAP } from "@/components/MoodTagChip/MoodTagChip.constants";
import styles from "./MoodTagButton.module.css";

const ICON_SIZE = 13;

const MOOD_ICONS: Record<string, React.ReactNode> = {
  "Hidden Gems":      <Gem size={ICON_SIZE} aria-hidden="true" />,
  "Instagrammable":   <Camera size={ICON_SIZE} aria-hidden="true" />,
  "Vibrant Nightlife":<Disc3 size={ICON_SIZE} aria-hidden="true" />,
  "Cultural Heritage":<Landmark size={ICON_SIZE} aria-hidden="true" />,
  "Adventure":        <Mountain size={ICON_SIZE} aria-hidden="true" />,
  "Beach Life":       <Waves size={ICON_SIZE} aria-hidden="true" />,
  "Food & Wine":      <UtensilsCrossed size={ICON_SIZE} aria-hidden="true" />,
};

interface MoodTagButtonProps {
  tag: string;
  selected: boolean;
  onToggle: (tag: string) => void;
}

export function MoodTagButton({ tag, selected, onToggle }: MoodTagButtonProps) {
  const tagClass = TAG_CLASS_MAP[tag] ?? "tagHiddenGems";

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
