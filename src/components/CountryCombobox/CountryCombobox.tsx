"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { CountryFlag } from "@/components/CountryFlag";
import styles from "./CountryCombobox.module.css";

interface CountryComboboxProps {
  /** Selected country name, or "" for none. */
  value: string;
  /** Country names to offer, in display order. */
  options: string[];
  onChange: (value: string) => void;
  /** When set, a first option with value "" is offered, labelled with this text. */
  emptyLabel?: string;
  /** Trigger text when nothing is selected and there is no emptyLabel. */
  placeholder?: string;
  id?: string;
  /** Id of a visible label element; preferred over ariaLabel when the form has one. */
  labelledBy?: string;
  ariaLabel?: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  /** Fires when focus leaves the control (for form validation on blur). */
  onBlur?: () => void;
}

const TYPEAHEAD_RESET_MS = 600;

/**
 * Select-only combobox for countries. Unlike a native select, each option shows its flag.
 * Keyboard: Arrow keys move, Home and End jump, Enter or Space picks, Escape closes, and
 * typing a name jumps to the next matching country. Follows the ARIA select-only combobox
 * pattern.
 */
export function CountryCombobox({
  value,
  options,
  onChange,
  emptyLabel,
  placeholder = "Select a country…",
  id,
  labelledBy,
  ariaLabel,
  describedBy,
  invalid = false,
  disabled = false,
  className,
  onBlur,
}: CountryComboboxProps) {
  const reactId = useId();
  const listId = `${reactId}-listbox`;
  const optionId = (i: number) => `${reactId}-option-${i}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: "", at: 0 });

  // The list starts with the empty choice when emptyLabel is set.
  const items: { value: string; label: string }[] = [
    ...(emptyLabel !== undefined ? [{ value: "", label: emptyLabel }] : []),
    ...options.map((o) => ({ value: o, label: o })),
  ];
  const selectedIndex = Math.max(0, items.findIndex((item) => item.value === value));

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selectedIndex);

  // Close on a click outside the control.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the active option visible while moving through a long list.
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  function openList() {
    if (disabled) return;
    setActive(selectedIndex);
    setOpen(true);
  }

  function pick(index: number) {
    const item = items[index];
    if (!item) return;
    onChange(item.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function jumpToTypedName(char: string) {
    const now = Date.now();
    const state = typeahead.current;
    state.text = now - state.at > TYPEAHEAD_RESET_MS ? char : state.text + char;
    state.at = now;
    const query = state.text.toLowerCase();
    // Search from the option after the active one, so repeated letters cycle through matches.
    const start = active + 1;
    const order = [...items.slice(start), ...items.slice(0, start)];
    const hit = order.find((item) => item.label.toLowerCase().startsWith(query));
    if (hit) setActive(items.indexOf(hit));
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(items.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(items.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        pick(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          jumpToTypedName(e.key);
        }
    }
  }

  const hasSelection = !!value;
  const triggerText = hasSelection ? value : emptyLabel ?? placeholder;

  return (
    <div ref={rootRef} className={`${styles.root} ${className ?? ""}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        className={`${styles.trigger} ${invalid ? styles.invalid : ""} ${!hasSelection ? styles.placeholder : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      >
        {hasSelection && <CountryFlag country={value} className={styles.flag} />}
        <span className={styles.triggerText}>{triggerText}</span>
        <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className={styles.list}
          aria-labelledby={labelledBy}
          aria-label={labelledBy ? undefined : ariaLabel}
          tabIndex={-1}
        >
          {items.map((item, i) => {
            const selected = item.value === value;
            const isActive = i === active;
            return (
              <li
                key={`${item.value}-${i}`}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                className={`${styles.option} ${isActive ? styles.optionActive : ""} ${selected ? styles.optionSelected : ""}`}
                // Keep focus on the trigger while the mouse picks an option.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(i)}
              >
                {item.value ? (
                  <CountryFlag country={item.value} className={styles.flag} />
                ) : (
                  <span className={styles.flagSpacer} aria-hidden="true" />
                )}
                <span className={styles.optionText}>{item.label}</span>
                {selected && <Check size={14} className={styles.check} aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
