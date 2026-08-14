import { Lock } from "lucide-react";
import styles from "./PrivateChip.module.css";
import type { PrivateChipProps } from "./PrivateChip.types";

const SIZE_CLASS = { sm: "chip", lg: "chipLg", xl: "chipXl" } as const;
const ICON_SIZE = { sm: 11, lg: 14, xl: 20 } as const;

export function PrivateChip({ className, size = "sm" }: PrivateChipProps) {
  return (
    <span className={[styles[SIZE_CLASS[size]], className].filter(Boolean).join(" ")}>
      <Lock size={ICON_SIZE[size]} aria-hidden="true" />
      Private
    </span>
  );
}
