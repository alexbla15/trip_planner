"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";
import { X, MapPin, Clock, ChevronDown, AlertCircle, Loader2, Tag, Globe, Building, Layers, Timer, Wallet, Check, FileText } from "lucide-react";
import type {
  AttractionFormData,
  Coordinates,
  DurationUnit,
  NewAttractionModalProps,
  OpeningHours,
} from "./attraction.types";
import {
  COUNTRIES,
  DEFAULT_OPENING_HOURS,
  DAY_KEYS,
} from "./attraction.constants";
import { CurrencySelect } from "@/components/CurrencySelect/CurrencySelect";
import { AttractionTypePicker } from "@/components/AttractionTypePicker/AttractionTypePicker";
import { CoverImageField } from "@/components";
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

export function NewAttractionModal({ isOpen, onClose, onSave, defaultCountry, initialData }: NewAttractionModalProps) {
  const isEditMode = Boolean(initialData);

  const [name, setName] = useState("");
  const [country, setCountry] = useState(defaultCountry ?? "");
  const [city, setCity] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  // Reverse-geocode and auto-fill name / city when user picks a map point
  async function handleCoordinatesChange(coords: Coordinates) {
    setCoordinates(coords);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&accept-language=en`,
        { headers: { "User-Agent": "TripPlannerApp/1.0" } }
      );
      if (!res.ok) return;
      const data = await res.json() as {
        name?: string;
        address?: { city?: string; town?: string; municipality?: string; village?: string; country?: string };
      };
      // Fill name only if the field is still empty
      if (!name.trim() && data.name) setName(data.name);
      // Fill city only if the field is still empty
      if (!city.trim()) {
        const resolvedCity = data.address?.city ?? data.address?.town ?? data.address?.municipality ?? data.address?.village ?? "";
        if (resolvedCity) setCity(resolvedCity);
      }
    } catch {
      // Reverse geocoding is best-effort — silently ignore failures
    }
  }
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("hours");
  const [price, setPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [openingHours, setOpeningHours] = useState<OpeningHours>(buildInitialHours);
  const [is24h, setIs24h]               = useState(false);
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
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

  // Sync form state each time the modal opens so switching between
  // edit-mode and create-mode always starts with the right values.
  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name ?? "");
    setCountry(initialData?.country ?? defaultCountry ?? "");
    setCity(initialData?.city ?? "");
    setCoordinates(initialData?.coordinates ?? null);
    setSelectedTypes(initialData?.types ?? []);
    setDurationValue(initialData?.durationValue ?? "");
    setDurationUnit(initialData?.durationUnit ?? "hours");
    setPrice(initialData?.price ?? null);
    setCurrency(initialData?.currency ?? "USD");
    setOpeningHours(
      (initialData?.openingHours as OpeningHours | undefined)?.Mon
        ? structuredClone(initialData?.openingHours as OpeningHours)
        : buildInitialHours()
    );
    setNotes(initialData?.notes ?? "");
    setPhotoUrl(initialData?.photoUrl ?? "");
    setErrors({});
    setTouched({});
    setIs24h(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handle24hToggle(checked: boolean) {
    setIs24h(checked);
    if (checked) {
      setOpeningHours(
        Object.fromEntries(
          DAY_KEYS.map((d) => [d, { closed: false, open: "00:00", close: "23:59" }])
        ) as OpeningHours
      );
    }
  }

  function handleHoursChange(hours: OpeningHours) {
    setIs24h(false);
    setOpeningHours(hours);
  }

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

  function toggleType(type: string) {
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
      currency,
      openingHours,
      notes,
      photoUrl,
    };
    await Promise.resolve(onSave(data));
    setSaving(false);
    handleReset();
    onClose();
  }

  function handleReset() {
    setName("");
    setCountry(defaultCountry ?? "");
    setCity("");
    setCoordinates(null);
    setSelectedTypes([]);
    setDurationValue("");
    setDurationUnit("hours");
    setPrice(null);
    setCurrency("USD");
    setOpeningHours(buildInitialHours());
    setNotes("");
    setPhotoUrl("");
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
            {isEditMode ? "Edit Attraction" : "New Attraction"}
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
              {!defaultCountry && <span className={styles.required} aria-hidden="true">*</span>}
            </label>
            {defaultCountry ? (
              <div
                className={styles.readOnlyField}
                aria-label={`Country: ${defaultCountry} (locked to trip destination)`}
              >
                {defaultCountry}
              </div>
            ) : (
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
            )}
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
            <AttractionTypePicker
              selectedTypes={selectedTypes}
              onToggle={(t) => {
                toggleType(t);
                setTouched((prev) => ({ ...prev, types: true }));
              }}
              labelId="types-label"
              errorId={touched.types && errors.types ? "error-types" : undefined}
            />
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
              onChange={handleCoordinatesChange}
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
              <CurrencySelect value={currency} onChange={setCurrency} />
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
                aria-label="Price amount"
              />
            </div>
          </div>

          {/* Opening Hours */}
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <span className={styles.labelWithIcon}>
                <Clock size={14} aria-hidden="true" />
                Opening Hours
              </span>
              <button
                type="button"
                role="checkbox"
                aria-checked={is24h}
                className={`${styles.toggle24h} ${is24h ? styles.toggle24hActive : ""}`}
                onClick={() => handle24hToggle(!is24h)}
              >
                24/7
              </button>
            </div>
            {!is24h && <OpeningHoursGrid value={openingHours} onChange={handleHoursChange} />}
          </div>

          {/* Notes / Comments */}
          <div className={styles.field}>
            <label htmlFor="attraction-notes" className={styles.labelWithIcon}>
              <FileText size={14} aria-hidden="true" />
              Notes
            </label>
            <textarea
              id="attraction-notes"
              rows={3}
              placeholder="e.g. Book tickets in advance, best visited in the morning…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.textarea}
            />
          </div>

          {/* Photo URL */}
          <CoverImageField
            id="attraction-photo"
            label="Photo URL"
            value={photoUrl}
            onChange={setPhotoUrl}
          />

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
                {isEditMode ? "Save Changes" : "Save Attraction"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
