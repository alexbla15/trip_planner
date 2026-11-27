"use client";

import { CountryCombobox } from "@/components/CountryCombobox";
import styles from "./CountryFilterSelect.module.css";

interface CountryFilterSelectProps {
  /** "all" for no filter, otherwise a country name. */
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label?: string;
}

/** Country filter with flags; "all" means every country. Same API as before. */
export function CountryFilterSelect({
  value,
  options,
  onChange,
  label = "Filter cities by country",
}: CountryFilterSelectProps) {
  return (
    <div className={styles.wrapper}>
      <CountryCombobox
        value={value === "all" ? "" : value}
        options={options}
        onChange={(next) => onChange(next === "" ? "all" : next)}
        emptyLabel="All countries"
        ariaLabel={label}
      />
    </div>
  );
}
