"use client";

import { useMoodTags, getMoodTagStyle } from "@/hooks/useMoodTags";
import { getIconComponent } from "@/lib/attractionIcons";
import styles from "./MoodTagButton.module.css";
import type { MoodTagButtonProps } from "./MoodTagButton.types";

export function MoodTagButton({ tag, selected, onToggle }: MoodTagButtonProps) {
  const { tagByName } = useMoodTags();
  const record = tagByName(tag);
  const Icon = record ? getIconComponent(record.icon) : null;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      className={[styles.moodBtn, selected ? styles.moodBtnSelected : ""].filter(Boolean).join(" ")}
      style={getMoodTagStyle(record)}
      onClick={() => onToggle(tag)}
    >
      {Icon && <Icon size={13} aria-hidden="true" />}
      {tag}
    </button>
  );
}
