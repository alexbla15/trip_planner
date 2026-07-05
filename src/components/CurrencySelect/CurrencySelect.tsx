"use client";

import { ChevronDown } from "lucide-react";
import { currencySymbol } from "@/lib/formatCurrency";
import styles from "./CurrencySelect.module.css";

export const SUPPORTED_CURRENCIES: readonly string[] = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY",
  "INR", "BRL", "MXN", "SGD", "AED", "ILS", "HUF",
  "KRW", "THB", "SEK", "NOK", "DKK", "PLN", "CZK", "TRY",
  "ZAR", "MYR", "IDR", "PHP", "NZD",
];

interface CurrencySelectProps {
  value: string;
  onChange: (code: string) => void;
}

export function CurrencySelect({ value, onChange }: CurrencySelectProps) {
  return (
    <div className={styles.wrapper}>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Price currency"
      >
        {SUPPORTED_CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {currencySymbol(code)} {code}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className={styles.icon} aria-hidden="true" />
    </div>
  );
}
