import styles from "./MoodTagChip.module.css";
import { TAG_CLASS_MAP } from "./MoodTagChip.constants";
import type { MoodTagChipProps } from "./MoodTagChip.types";

export function MoodTagChip({ tag, className }: MoodTagChipProps) {
  const tagClass = TAG_CLASS_MAP[tag] ?? "tagHiddenGems";

  return (
    <span
      className={[styles.chip, styles[tagClass], className]
        .filter(Boolean)
        .join(" ")}
    >
      {tag}
    </span>
  );
}
