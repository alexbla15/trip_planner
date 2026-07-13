"use client";

import { ChevronDown } from "lucide-react";
import styles from "./CountryFilterSelect.module.css";

interface CountryFilterSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label?: string;
}

export function CountryFilterSelect({
  value,
  options,
  onChange,
  label = "Filter cities by country",
}: CountryFilterSelectProps) {
  return (
    <div className={styles.wrapper}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.select}
        aria-label={label}
      >
        <option value="all">All countries</option>
        {options.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <ChevronDown size={14} className={styles.icon} aria-hidden="true" />
    </div>
  );
}
