"use client";

import { Sun, Moon } from "lucide-react";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  function toggle() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  return (
    <button
      className={styles.toggle}
      onClick={toggle}
      aria-label="Toggle color theme"
    >
      <span className={styles.moonIcon}>
        <Moon size={18} aria-hidden="true" />
      </span>
      <span className={styles.sunIcon}>
        <Sun size={18} aria-hidden="true" />
      </span>
    </button>
  );
}
