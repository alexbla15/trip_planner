"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import styles from "./SearchableSelect.module.css";
import type { SearchableSelectProps } from "./SearchableSelect.types";

export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Search…",
  loading = false,
  disabled = false,
  allowFreeText = false,
  error = false,
  ariaLabel,
  ariaRequired,
  ariaDescribedBy,
  onBlur,
  emptyMessage = "No matches",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLUListElement>(null);

  // Keep the displayed text in sync with an externally-changed value (e.g. the form
  // resetting) as long as the user isn't actively editing it.
  useEffect(() => {
    if (!isOpen) setQuery(value);
  }, [value, isOpen]);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  function openDropdown() {
    if (disabled) return;
    setIsOpen(true);
    setHighlightedIndex(-1);
  }

  function commit(v: string) {
    onChange(v);
    setQuery(v);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  // On blur/Escape: an exact (case-insensitive) match to a listed option always commits
  // that option's canonical casing; otherwise free text is accepted only if allowed,
  // else the field reverts to the last committed value.
  function closeAndReconcile() {
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (query === value) return;
    const exactMatch = options.find((o) => o.toLowerCase() === query.trim().toLowerCase());
    if (exactMatch) {
      onChange(exactMatch);
      setQuery(exactMatch);
      return;
    }
    if (allowFreeText && query.trim()) {
      onChange(query.trim());
      return;
    }
    setQuery(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) { openDropdown(); break; }
        setHighlightedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          commit(filtered[highlightedIndex]);
        } else if (allowFreeText && query.trim()) {
          commit(query.trim());
        }
        break;
      case "Escape":
        e.preventDefault();
        setQuery(value);
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }

  // Scroll keyboard-highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  // Close on outside mousedown (option clicks use e.preventDefault to prevent this
  // from firing before the click's onMouseDown handler runs).
  useEffect(() => {
    if (!isOpen) return;
    function onOutsideMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closeAndReconcile();
      }
    }
    document.addEventListener("mousedown", onOutsideMouseDown);
    return () => document.removeEventListener("mousedown", onOutsideMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, query, value]);

  const listboxId = id ? `${id}-listbox` : undefined;

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        className={[styles.input, error ? styles.inputError : ""].filter(Boolean).join(" ")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlightedIndex(-1);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={openDropdown}
        onKeyDown={handleKeyDown}
        onBlur={() => { closeAndReconcile(); onBlur?.(); }}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-required={ariaRequired}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-activedescendant={
          isOpen && highlightedIndex >= 0 && id ? `${id}-opt-${highlightedIndex}` : undefined
        }
        autoComplete="off"
      />
      {loading
        ? <Loader2 size={16} className={`${styles.icon} ${styles.iconSpin}`} aria-hidden="true" />
        : <ChevronDown size={16} className={styles.icon} aria-hidden="true" />}

      {isOpen && (
        <ul ref={listRef} id={listboxId} role="listbox" aria-label={ariaLabel} className={styles.dropdown}>
          {loading ? (
            <li className={styles.emptyMsg}>Loading…</li>
          ) : filtered.length === 0 ? (
            <li className={styles.emptyMsg}>
              {allowFreeText && query.trim() ? `Use "${query.trim()}"` : emptyMessage}
            </li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o}
                id={id ? `${id}-opt-${i}` : undefined}
                role="option"
                aria-selected={o === value}
                className={[
                  styles.option,
                  i === highlightedIndex ? styles.optionHighlighted : "",
                  o === value ? styles.optionSelected : "",
                ].filter(Boolean).join(" ")}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep input focused so blur doesn't fire before select
                  commit(o);
                }}
              >
                {o}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
