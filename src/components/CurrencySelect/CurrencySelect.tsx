"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import styles from "./CurrencySelect.module.css";

export interface Currency {
  code: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: readonly Currency[] = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "INR", name: "Indian Rupee" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "AED", name: "UAE Dirham" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "KRW", name: "South Korean Won" },
  { code: "THB", name: "Thai Baht" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Złoty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "ZAR", name: "South African Rand" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
];

interface CurrencySelectProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function CurrencySelect({ value, onChange, disabled = false }: CurrencySelectProps) {
  const [isOpen,           setIsOpen]           = useState(false);
  const [query,            setQuery]            = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef    = useRef<HTMLUListElement>(null);

  const filtered = SUPPORTED_CURRENCIES.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  function openDropdown() {
    if (disabled) return;
    setIsOpen(true);
    setQuery("");
    setHighlightedIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function closeDropdown() {
    setIsOpen(false);
    setQuery("");
    setHighlightedIndex(-1);
  }

  function select(code: string) {
    onChange(code);
    closeDropdown();
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          select(filtered[highlightedIndex].code);
        }
        break;
      case "Tab":
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          onChange(filtered[highlightedIndex].code);
        }
        closeDropdown();
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        requestAnimationFrame(() => triggerRef.current?.focus());
        break;
    }
  }

  // Scroll keyboard-highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  // Close on outside mousedown (item clicks use e.preventDefault to prevent this)
  useEffect(() => {
    if (!isOpen) return;
    function onOutsideMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", onOutsideMouseDown);
    return () => document.removeEventListener("mousedown", onOutsideMouseDown);
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className={styles.comboWrapper}>
      {isOpen ? (
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onBlur={closeDropdown}
            placeholder={value}
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
            aria-controls="currency-listbox"
            aria-autocomplete="list"
            aria-activedescendant={
              highlightedIndex >= 0 ? `currency-opt-${highlightedIndex}` : undefined
            }
            autoComplete="off"
          />
          <button
            type="button"
            className={styles.clearBtn}
            onMouseDown={(e) => {
              e.preventDefault(); // keep input focused
              setQuery("");
              inputRef.current?.focus();
            }}
            tabIndex={-1}
            aria-label="Clear search"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className={[styles.trigger, disabled ? styles.triggerDisabled : ""].filter(Boolean).join(" ")}
          onClick={openDropdown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-label={`Currency: ${value}`}
        >
          <span>{value}</span>
          <ChevronDown size={14} className={styles.triggerIcon} aria-hidden="true" />
        </button>
      )}

      {isOpen && (
        <ul
          ref={listRef}
          id="currency-listbox"
          role="listbox"
          aria-label="Select currency"
          className={styles.dropdown}
        >
          {filtered.length === 0 ? (
            <li className={styles.emptyMsg} role="option" aria-selected="false">
              No currencies match
            </li>
          ) : (
            filtered.map((c, i) => (
              <li
                key={c.code}
                id={`currency-opt-${i}`}
                role="option"
                aria-selected={c.code === value}
                className={[
                  styles.option,
                  i === highlightedIndex ? styles.optionHighlighted : "",
                  c.code === value       ? styles.optionSelected    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur before select fires
                  select(c.code);
                }}
              >
                <span className={styles.optionCode}>{c.code}</span>
                <span className={styles.optionName}>{c.name}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
