"use client";

import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
} from "react";
import { MapPin, Clock, ChevronDown, AlertCircle, Loader2, Tag, Globe, Building, Layers, Timer, Wallet, Check, FileText, X } from "lucide-react";
import type {
  AttractionFormData,
  Coordinates,
  DurationUnit,
  NewAttractionModalProps,
  OpeningHours,
} from "./attraction.types";
import {
  COUNTRIES,
  DAY_KEYS,
} from "./attraction.constants";
import { CurrencySelect } from "@/components/CurrencySelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { reverseGeocode, getCities } from "@/services";
import { AttractionTypePicker } from "@/components/AttractionTypePicker";
import { CoverImageField } from "@/components";
import { ModalShell } from "@/components/Modal";
import { MapPicker } from "./MapPicker";
import { OpeningHoursGrid } from "./OpeningHoursGrid";
import { buildInitialHours, isValidUrl } from "@/lib";
import styles from "./NewAttractionModal.module.css";

const HEADING_ID = "new-attraction-modal-title";

interface FieldErrors {
  name?: string;
  country?: string;
  types?: string;
  websiteUrl?: string;
}

export function NewAttractionModal({ isOpen, onClose, onSave, defaultCountry, prefillCountry, prefillCity, initialData, initialCoordinates }: NewAttractionModalProps) {
  const isEditMode = Boolean(initialData);

  const [name, setName] = useState("");
  const [country, setCountry] = useState(defaultCountry ?? "");
  const [city, setCity] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [knownCities, setKnownCities] = useState<{ name: string; country: string }[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // Load existing DB cities once per modal open, so the city field can suggest places
  // already in use — never blocks/required, a brand-new city is still a valid entry.
  useEffect(() => {
    if (!isOpen) return;
    setCitiesLoading(true);
    getCities()
      .then((data) => setKnownCities((data as { cities: { name: string; country: string }[] }).cities ?? []))
      .catch(() => setKnownCities([]))
      .finally(() => setCitiesLoading(false));
  }, [isOpen]);

  // Only suggest cities within the selected country (once one is chosen) — otherwise
  // every city in the DB would show, which isn't useful once a country is picked.
  const cityOptions = (() => {
    const scoped = country
      ? knownCities.filter((c) => c.country.toLowerCase() === country.toLowerCase())
      : knownCities;
    return [...new Set(scoped.map((c) => c.name))].sort((a, b) => a.localeCompare(b));
  })();

  // Reverse-geocode and auto-fill name / city when user picks a map point
  async function handleCoordinatesChange(coords: Coordinates) {
    setCoordinates(coords);
    try {
      const data = await reverseGeocode(coords.lat, coords.lng) as {
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
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Sync form state each time the modal opens so switching between
  // edit-mode and create-mode always starts with the right values.
  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name ?? "");
    setCountry(initialData?.country ?? defaultCountry ?? prefillCountry ?? "");
    setCity(initialData?.city ?? prefillCity ?? "");
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
    setWebsiteUrl(initialData?.websiteUrl ?? "");
    setErrors({});
    setTouched({});
    setIs24h(false);
    // Pre-fill just the location (e.g. from a dropped map pin) without entering edit
    // mode — reuses the same reverse-geocode auto-fill as a user-driven map click.
    if (!initialData && initialCoordinates) {
      handleCoordinatesChange(initialCoordinates);
    }
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

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = "Attraction name is required";
    if (!country) errs.country = "Country is required";
    if (selectedTypes.length === 0) errs.types = "Select at least one type";
    if (!isValidUrl(websiteUrl)) errs.websiteUrl = "Enter a valid URL (e.g. https://example.com)";
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

  async function handleSave() {
    const allTouched = { name: true, country: true, types: true, websiteUrl: true };
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
      websiteUrl: websiteUrl.trim(),
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
    setWebsiteUrl("");
    setErrors({});
    setTouched({});
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  const formIsValid = Object.keys(validate()).length === 0;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      styles={styles}
      headingId={HEADING_ID}
      initialFocusRef={firstInputRef}
      header={
        <h2 id={HEADING_ID} className={styles.title}>
          <MapPin size={18} aria-hidden="true" className={styles.titleIcon} />
          {isEditMode ? "Edit Attraction" : "New Attraction"}
        </h2>
      }
      footer={
        <>
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
        </>
      }
    >
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
          <SearchableSelect
            id="attraction-country"
            value={country}
            onChange={setCountry}
            onBlur={() => handleBlur("country")}
            options={COUNTRIES}
            placeholder="Search country…"
            error={touched.country && !!errors.country}
            ariaRequired
            ariaLabel="Country"
            ariaDescribedBy={touched.country && errors.country ? "error-country" : undefined}
          />
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
        <SearchableSelect
          id="attraction-city"
          value={city}
          onChange={setCity}
          options={cityOptions}
          loading={citiesLoading}
          allowFreeText
          placeholder="e.g. Paris"
          ariaLabel="City"
          emptyMessage="No existing cities match — type to add a new one"
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

      {/* Official website */}
      <div className={styles.field}>
        <label htmlFor="attraction-website" className={styles.labelWithIcon}>
          <Globe size={14} aria-hidden="true" />
          Website (optional)
        </label>
        <input
          id="attraction-website"
          type="url"
          placeholder="https://…"
          value={websiteUrl}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setWebsiteUrl(e.target.value)}
          onBlur={() => handleBlur("websiteUrl")}
          className={`${styles.input} ${touched.websiteUrl && errors.websiteUrl ? styles.inputError : ""}`}
          aria-describedby={touched.websiteUrl && errors.websiteUrl ? "error-website" : undefined}
        />
        {touched.websiteUrl && errors.websiteUrl && (
          <p id="error-website" className={styles.errorMsg} role="alert">
            <AlertCircle size={12} aria-hidden="true" />
            {errors.websiteUrl}
          </p>
        )}
      </div>
    </ModalShell>
  );
}
