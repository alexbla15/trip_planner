"use client";

import { useMoodTags } from "@/hooks/useMoodTags";
import { getIconComponent } from "@/components/IconPicker/iconPicker.utils";
import styles from "./MoodTagChip.module.css";
import type { MoodTagChipProps } from "./MoodTagChip.types";

export function MoodTagChip({ tag, className }: MoodTagChipProps) {
  const { tagByName } = useMoodTags();
  const record = tagByName(tag);
  const Icon = record ? getIconComponent(record.icon) : null;

  return (
    <span
      className={[styles.chip, className].filter(Boolean).join(" ")}
      style={{
        "--tag-color":    record?.color    ?? "#888",
        "--tag-bg":       record?.bgColor  ?? "#f5f5f5",
        "--tag-dark-color": record?.darkColor   ?? record?.color   ?? "#888",
        "--tag-dark-bg":    record?.darkBgColor ?? record?.bgColor ?? "#f5f5f5",
      } as React.CSSProperties}
    >
      {Icon && <Icon size={11} aria-hidden="true" />}
      {tag}
    </span>
  );
}
