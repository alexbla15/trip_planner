import styles from "./MoodTagChip.module.css";
import { TAG_CLASS_MAP, TAG_ICON_MAP } from "./MoodTagChip.constants";
import type { MoodTagChipProps } from "./MoodTagChip.types";

export function MoodTagChip({ tag, className }: MoodTagChipProps) {
  const tagClass = TAG_CLASS_MAP[tag] ?? "tagHiddenGems";
  const Icon = TAG_ICON_MAP[tag];

  return (
    <span
      className={[styles.chip, styles[tagClass], className]
        .filter(Boolean)
        .join(" ")}
    >
      {Icon && <Icon size={11} aria-hidden="true" />}
      {tag}
    </span>
  );
}
