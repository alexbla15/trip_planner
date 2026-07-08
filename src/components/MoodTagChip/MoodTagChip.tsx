"use client";

import { useMoodTags, getMoodTagStyle } from "@/hooks/useMoodTags";
import { getIconComponent } from "@/lib/attractionIcons";
import styles from "./MoodTagChip.module.css";
import type { MoodTagChipProps } from "./MoodTagChip.types";

export function MoodTagChip({ tag, className }: MoodTagChipProps) {
  const { tagByName } = useMoodTags();
  const record = tagByName(tag);
  const Icon = record ? getIconComponent(record.icon) : null;

  return (
    <span
      className={[styles.chip, className].filter(Boolean).join(" ")}
      style={getMoodTagStyle(record)}
    >
      {Icon && <Icon size={11} aria-hidden="true" />}
      {tag}
    </span>
  );
}
