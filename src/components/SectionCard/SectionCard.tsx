"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./SectionCard.module.css";

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ icon: Icon, title, children, className }: SectionCardProps) {
  return (
    <div className={`${styles.card}${className ? ` ${className}` : ""}`}>
      <div className={styles.headingRow}>
        <div className={styles.iconCircle}>
          <Icon size={18} aria-hidden="true" />
        </div>
        <h2 className={styles.heading}>{title}</h2>
      </div>
      {children}
    </div>
  );
}
