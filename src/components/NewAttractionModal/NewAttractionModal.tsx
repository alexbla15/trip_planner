"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";
import { X, MapPin, Clock, ChevronDown, AlertCircle, Loader2, Tag, Globe, Building, Layers, Timer, Wallet, Check } from "lucide-react";
import type {
  AttractionFormData,
  AttractionType,
  Coordinates,
  DurationUnit,
  NewAttractionModalProps,
  OpeningHours,
} from "./attraction.types";
import {
  ATTRACTION_TYPES,
  COUNTRIES,
  DEFAULT_OPENING_HOURS,
} from "./attraction.constants";
import { AttractionTypeChip } from "./AttractionTypeChip";
import { MapPicker } from "./MapPicker";
import { OpeningHoursGrid } from "./OpeningHoursGrid";
import styles from "./NewAttractionModal.module.css";

const HEADING_ID = "new-attraction-modal-title";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function buildInitialHours(): OpeningHours {
  return structuredClone(DEFAULT_OPENING_HOURS);
}

interface FieldErrors {
  name?: string;
  country?: string;
  types?: string;
}

export function NewAttractionModal({ isOpen, onClose, onSave }: NewAttractionModalProps) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<AttractionType[]>([]);
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("hours");
  const [price, setPrice] = useState<number | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHours>(buildInitialHours);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        firstInputRef.current?.focus();
      });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = "Attraction name is required";
    if (!country) errs.country = "Country is required";
    if (selectedTypes.length === 0) errs.types = "Select at least one type";
    return errs;
  }

  function handleBlur(field: keyof FieldErrors) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validate();
    setErrors(errs);
  }

  function toggleType(type: AttractionType) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSave() {
    const allTouched = { name: true, country: true, types: true };
    setTouched(allTouched);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const data: AttractionFormData = {
      name: name.trim(),
      country,
      city: city.trim(),
      coordinates,
      types: selectedTypes,
      durationValue,
      durationUnit,
      price,
      openingHours,
    };
    await Promise.resolve(onSave(data));
    setSaving(false);
    handleReset();
    onClose();
  }

  function handleReset() {
    setName("");
    setCountry("");
    setCity("");
    setCoordinates(null);
    setSelectedTypes([]);
    setDurationValue("");
    setDurationUnit("hours");
    setPrice(null);
    setOpeningHours(buildInitialHours());
    setErrors({});
    setTouched({});
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  const formIsValid = Object.keys(validate()).length === 0;

  if (!mounted || !isOpen) return null;

  const modal = (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={HEADING_ID}
        className={styles.container}
        aria-hidden="false"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 id={HEADING_ID} className={styles.title}>
            <MapPin size={18} aria-hidden="true" className={styles.titleIcon} />
            New Attraction
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close modal"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Name */}
          <div className={styles.field}>
            <label htmlFor="attraction-name" className={styles.labelWithIcon}>
              <Tag size={14} aria-hidden="true" />
              Attraction name{" "}
              <span className={styles.required} aria-hidden="true">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="attraction-name"
              type="text"
              placeholder="e.g. Louvre Museum"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              onBlur={() => handleBlur("name")}
              className={`${styles.input} ${touched.name && errors.name ? styles.inputError : ""}`}
              aria-required="true"
              aria-describedby={touched.name && errors.name ? "error-name" : undefined}
            />
            {touched.name && errors.name && (
              <p id="error-name" className={styles.errorMsg} role="alert">
                <AlertCircle size={12} aria-hidden="true" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Country */}
          <div className={styles.field}>
            <label htmlFor="attraction-country" className={styles.labelWithIcon}>
              <Globe size={14} aria-hidden="true" />
              Country{" "}
              <span className={styles.required} aria-hidden="true">*</span>
            </label>
            <div className={styles.selectWrapper}>
              <select
                id="attraction-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                onBlur={() => handleBlur("country")}
                className={`${styles.select} ${touched.country && errors.country ? styles.inputError : ""}`}
                aria-required="true"
                aria-describedby={touched.country && errors.country ? "error-country" : undefined}
              >
                <option value="">Select a country…</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className={styles.selectIcon}
                aria-hidden="true"
              />
            </div>
            {touched.country && errors.country && (
              <p id="error-country" className={styles.errorMsg} role="alert">
                <AlertCircle size={12} aria-hidden="true" />
                {errors.country}
              </p>
            )}
          </div>

          {/* City */}
          <div className={styles.field}>
            <label htmlFor="attraction-city" className={styles.labelWithIcon}>
              <Building size={14} aria-hidden="true" />
              City
            </label>
            <input
              id="attraction-city"
              type="text"
              placeholder="e.g. Paris"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={styles.input}
              aria-label="City"
            />
          </div>

          {/* Type */}
          <div className={styles.field}>
            <span id="types-label" className={styles.labelWithIcon}>
              <Layers size={14} aria-hidden="true" />
              Type{" "}
              <span className={styles.required} aria-hidden="true">*</span>
            </span>
            <div
              className={styles.chipGroup}
              role="group"
              aria-labelledby="types-label"
              aria-describedby={touched.types && errors.types ? "error-types" : undefined}
            >
              {ATTRACTION_TYPES.map((type) => (
                <AttractionTypeChip
                  key={type}
                  type={type}
                  selected={selectedTypes.includes(type)}
                  onToggle={(t) => {
                    toggleType(t);
                    setTouched((prev) => ({ ...prev, types: true }));
                  }}
                />
              ))}
            </div>
            {touched.types && errors.types && (
              <p id="error-types" className={styles.errorMsg} role="alert">
                <AlertCircle size={12} aria-hidden="true" />
                {errors.types}
              </p>
            )}
          </div>

          {/* Location */}
          <div className={styles.field}>
            <span className={styles.labelWithIcon}>
              <MapPin size={14} aria-hidden="true" />
              Location
            </span>
            <MapPicker
              coordinates={coordinates}
              onChange={setCoordinates}
            />
          </div>

          {/* Duration */}
          <div className={styles.field}>
            <label className={styles.labelWithIcon}>
              <Timer size={14} aria-hidden="true" />
              Duration
            </label>
            <div className={styles.durationRow}>
              <input
                id="attraction-duration"
                type="number"
                min="1"
                placeholder="e.g. 2"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className={styles.durationInput}
                aria-label="Duration value"
              />
              <div className={styles.selectWrapper}>
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                  className={styles.durationSelect}
                  aria-label="Duration unit"
                >
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                </select>
                <ChevronDown
                  size={16}
                  className={styles.selectIcon}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* Price */}
          <div className={styles.field}>
            <label htmlFor="attraction-price" className={styles.labelWithIcon}>
              <Wallet size={14} aria-hidden="true" />
              Price
            </label>
            <div className={styles.priceRow}>
              <span className={styles.priceCurrency} aria-hidden="true">$</span>
              <input
                id="attraction-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price ?? ""}
                onChange={(e) =>
                  setPrice(e.target.value === "" ? null : parseFloat(e.target.value))
                }
                className={styles.priceInput}
                aria-label="Price amount in dollars"
              />
            </div>
          </div>

          {/* Opening Hours */}
          <div className={styles.field}>
            <span className={styles.labelWithIcon}>
              <Clock size={14} aria-hidden="true" />
              Opening Hours
            </span>
            <OpeningHoursGrid value={openingHours} onChange={setOpeningHours} />
          </div>

        </div>

        {/* Footer — outside body so it stays pinned and never scrolls */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={handleClose}
          >
            <X size={15} aria-hidden="true" />
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || (!formIsValid && Object.keys(touched).length > 0)}
            aria-disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={15} className={styles.spinner} aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                <Check size={15} aria-hidden="true" />
                Save Attraction
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
