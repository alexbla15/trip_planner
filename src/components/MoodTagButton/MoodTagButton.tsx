"use client";

import { useMoodTags } from "@/hooks/useMoodTags";
import { getIconComponent } from "@/components/IconPicker/iconPicker.utils";
import styles from "./MoodTagButton.module.css";

interface MoodTagButtonProps {
  tag: string;
  selected: boolean;
  onToggle: (tag: string) => void;
}

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
      style={{
        "--tag-color":    record?.color    ?? "#888",
        "--tag-bg":       record?.bgColor  ?? "#f5f5f5",
        "--tag-dark-color": record?.darkColor   ?? record?.color   ?? "#888",
        "--tag-dark-bg":    record?.darkBgColor ?? record?.bgColor ?? "#f5f5f5",
      } as React.CSSProperties}
      onClick={() => onToggle(tag)}
    >
      {Icon && <Icon size={13} aria-hidden="true" />}
      {tag}
    </button>
  );
}
