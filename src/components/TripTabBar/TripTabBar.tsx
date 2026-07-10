"use client";

import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./TripTabBar.module.css";

interface Tab {
  id: string;
  label: string;
  Icon: LucideIcon;
}

interface TripTabBarProps {
  tabs: readonly Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function TripTabBar({ tabs, active, onChange }: TripTabBarProps) {
  const navRef = useRef<HTMLElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    const idx = tabs.findIndex((t) => t.id === active);
    let next = idx;

    switch (e.key) {
      case "ArrowRight": next = (idx + 1) % tabs.length; break;
      case "ArrowLeft":  next = (idx - 1 + tabs.length) % tabs.length; break;
      case "Home":       next = 0; break;
      case "End":        next = tabs.length - 1; break;
      default:           return;
    }

    e.preventDefault();
    const nextTab = tabs[next];
    onChange(nextTab.id);
    navRef.current?.querySelector<HTMLButtonElement>(`#tab-${nextTab.id}`)?.focus();
  }

  return (
    <div className={styles.strip}>
      <nav
        ref={navRef}
        role="tablist"
        aria-label="Trip sections"
        className={styles.inner}
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`${styles.tab}${isActive ? ` ${styles.active}` : ""}`}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              <tab.Icon size={16} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
