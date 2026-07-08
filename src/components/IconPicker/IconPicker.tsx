"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { ICON_NAMES, getIconComponent } from "./iconPicker.utils";
import styles from "./IconPicker.module.css";

const COLS = 6;

interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const preOpenRef = useRef(value);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? ICON_NAMES.filter((n) => n.toLowerCase().includes(query.toLowerCase()))
    : ICON_NAMES;

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [open]);

  function openDropdown() {
    preOpenRef.current = value;
    setQuery("");
    setOpen(true);
  }

  function closeAndRevert() {
    onChange(preOpenRef.current);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  function select(name: string) {
    onChange(name);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  // relatedTarget is the element receiving focus after the blur. When focus moves
  // to a child of the container (e.g. a grid cell) this stays truthy and we keep
  // the dropdown open. When focus leaves the component entirely it is null/outside,
  // so we close and revert to the pre-open value.
  function handleContainerBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!open) return;
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      closeAndRevert();
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        closeAndRevert();
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlighted]) select(filtered[highlighted]);
        break;
      case "Tab":
        if (filtered[highlighted]) {
          e.preventDefault();
          select(filtered[highlighted]);
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        setHighlighted((h) => (h + 1) % filtered.length);
        break;
      case "ArrowLeft":
        e.preventDefault();
        setHighlighted((h) => (h - 1 + filtered.length) % filtered.length);
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h + COLS, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - COLS, 0));
        break;
    }
  }

  const SelectedIcon = getIconComponent(value);

  return (
    <div
      className={styles.wrapper}
      ref={containerRef}
      onBlur={handleContainerBlur}
    >
      <button
        type="button"
        className={open ? `${styles.trigger} ${styles.triggerOpen}` : styles.trigger}
        onClick={openDropdown}
        aria-expanded={open}
        aria-haspopup="true"
        ref={triggerRef}
      >
        <span className={styles.triggerIcon}>
          <SelectedIcon size={18} aria-hidden="true" />
        </span>
        <ChevronDown size={13} className={styles.chevron} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.dropdown} role="dialog" aria-label="Pick an icon">
          <div className={styles.searchBar}>
            <Search size={13} className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search icons…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              aria-label="Search icons"
            />
          </div>

          <div className={styles.grid} role="grid">
            {filtered.length === 0 ? (
              <p className={styles.empty}>No icons match</p>
            ) : (
              filtered.map((name, idx) => {
                const Icon = getIconComponent(name);
                const isSelected = name === value;
                const isHighlighted = idx === highlighted;
                let cellClass = styles.cell;
                if (isSelected && isHighlighted) cellClass += ` ${styles.cellSelectedHighlighted}`;
                else if (isSelected) cellClass += ` ${styles.cellSelected}`;
                else if (isHighlighted) cellClass += ` ${styles.cellHighlighted}`;
                return (
                  <button
                    key={name}
                    type="button"
                    role="gridcell"
                    tabIndex={-1}
                    title={name}
                    aria-label={name}
                    aria-selected={isSelected}
                    className={cellClass}
                    // preventDefault stops the search input from losing focus
                    // before onClick fires, which would close the dropdown first.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(name);
                    }}
                    onMouseEnter={() => setHighlighted(idx)}
                  >
                    <Icon size={16} aria-hidden="true" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
