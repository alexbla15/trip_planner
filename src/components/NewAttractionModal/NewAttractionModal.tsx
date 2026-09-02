"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type ChangeEvent,
} from "react";
import { MapPin, Clock, Calendar, ChevronDown, AlertCircle, Loader2, Tag, Globe, Building, Layers, Timer, Wallet, Check, FileText, X, Building2, Search, UtensilsCrossed, Plus } from "lucide-react";
import type {
  AttractionFormData,
  Coordinates,
  DurationUnit,
  NewAttractionModalProps,
  OpeningHours,
  PriceTierDraft,
  SeasonalHoursEntry,
} from "./attraction.types";
import {
  COUNTRIES,
  DAY_KEYS,
} from "./attraction.constants";
import { CurrencySelect } from "@/components/CurrencySelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { getCities } from "@/services";
import { AttractionTypePicker } from "@/components/AttractionTypePicker";
import { CoverImageField } from "@/components";
import { ModalShell } from "@/components/Modal";
import { MapPicker } from "./MapPicker";
import { OpeningHoursGrid } from "./OpeningHoursGrid";
import { MonthsGrid } from "./MonthsGrid";
import { SeasonalRangePicker } from "./SeasonalRangePicker";
import { ParentAttractionPicker } from "./ParentAttractionPicker";
import { buildInitialHours, normalizeOpeningHours, hasOpeningHoursData, isAllDay24h, isValidUrl, isYearRound, ALL_MONTHS } from "@/lib";
import { useReverseGeocodeAutofill, useAttractionTypes, useFoodStyles } from "@/hooks";
import { filterCityOptions } from "./NewAttractionModal.utils";
import type { Attraction } from "@/types/attraction";
import styles from "./NewAttractionModal.module.css";

const HEADING_ID = "new-attraction-modal-title";

// Dining-category types that don't need a food-style/cuisine picker — there's no
// meaningful "cuisine" concept for a bar, ice cream stand, or supermarket the way there
// is for a restaurant, café, food truck, etc.
const NO_FOOD_STYLE_TYPES = new Set(["Bar", "Ice Cream", "Supermarket"]);

function build24hHours(): OpeningHours {
  return Object.fromEntries(
    DAY_KEYS.map((d) => [d, { closed: false, ranges: [{ open: "00:00", close: "23:59" }] }])
  ) as OpeningHours;
}

interface FieldErrors {
  name?: string;
  country?: string;
  types?: string;
  websiteUrl?: string;
}

export function NewAttractionModal({ isOpen, onClose, onSave, defaultCountry, prefillCountry, prefillCity, initialData, initialCoordinates, editingAttractionId, token }: NewAttractionModalProps) {
  const isEditMode = Boolean(initialData);
  // Residences are always treated as open 24/7 — hotels/apartments aren't meaningfully
  // "closed" the way a museum is, so there's no reason to expose hour/month pickers for
  // them. Price and duration are also per-trip concerns for a residence (see
  // AddResidenceModal/IScheduleEntry), not shared-document ones, so this generic edit
  // form (reached e.g. via Explore's "Edit" button on any attraction, including a
  // residence someone else added) hides them rather than risk editing the wrong thing.
  const isEditingResidence = initialData?.subtype === "residence";

  const { findType } = useAttractionTypes();
  const { styles: foodStyleOptions } = useFoodStyles();

  const [name, setName] = useState("");
  const [country, setCountry] = useState(defaultCountry ?? "");
  const [city, setCity] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [parentAttractionId, setParentAttractionId] = useState<string | null>(null);
  const [parentAttractionName, setParentAttractionName] = useState<string | null>(null);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
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
  const cityOptions = useMemo(
    () => filterCityOptions(knownCities, country),
    [knownCities, country],
  );

  const handleCoordinatesChange = useReverseGeocodeAutofill({
    name,
    city,
    onCoordinates: setCoordinates,
    onNameResolved: setName,
    onCityResolved: setCity,
  });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedFoodStyles, setSelectedFoodStyles] = useState<string[]>([]);
  // Food styles only make sense for a dining-type attraction — driven by the selected
  // type's admin-managed category name, not a hardcoded type list — except a couple of
  // Dining types where a "food style"/cuisine concept doesn't apply (a bar or ice cream
  // stand isn't a cuisine in the same sense a restaurant is).
  const isDining = selectedTypes.some((t) => {
    if (NO_FOOD_STYLE_TYPES.has(t)) return false;
    return findType(t)?.category?.trim().toLowerCase() === "dining";
  });
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("hours");
  const [priceTiers, setPriceTiers] = useState<PriceTierDraft[]>([
    { product: "", label: "Regular", amount: null, isPrimary: true, visitorType: "", days: [] },
  ]);
  const [expandedTierIndex, setExpandedTierIndex] = useState<number | null>(null);
  const [customDaysPopupIndex, setCustomDaysPopupIndex] = useState<number | null>(null);
  const [expandedTextField, setExpandedTextField] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [openingHours, setOpeningHours] = useState<OpeningHours>(buildInitialHours);
  const [is24h, setIs24h]               = useState(false);
  const [openingMonths, setOpeningMonths] = useState<number[]>(ALL_MONTHS);
  const [yearRound, setYearRound]         = useState(true);
  const [seasonalHours, setSeasonalHours] = useState<SeasonalHoursEntry[]>([]);
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
    setParentAttractionId(initialData?.parentAttractionId ?? null);
    setParentAttractionName(initialData?.parentAttractionName ?? null);
    setSelectedTypes(initialData?.types ?? []);
    setSelectedFoodStyles(initialData?.foodStyles ?? []);
    setDurationValue(initialData?.durationValue ?? "");
    setDurationUnit(initialData?.durationUnit ?? "hours");
    setPriceTiers(
      initialData?.prices?.length
        ? initialData.prices.map((t) => ({
            product: t.product ?? "",
            label: t.label,
            amount: t.amount,
            isPrimary: t.isPrimary,
            visitorType: t.visitorType ?? "",
            days: t.days ?? [],
          }))
        : [{ product: "", label: "Regular", amount: initialData?.price ?? null, isPrimary: true, visitorType: "", days: [] }]
    );
    setCurrency(initialData?.currency ?? "USD");
    const isResidence = initialData?.subtype === "residence";
    const loadedHours = isResidence
      ? build24hHours() // residences are always "open" — no per-day pickers for them
      : hasOpeningHoursData(initialData?.openingHours)
        ? normalizeOpeningHours(initialData?.openingHours)
        : buildInitialHours();
    setOpeningHours(loadedHours);
    const loadedMonths = initialData?.openingMonths?.length ? initialData.openingMonths : ALL_MONTHS;
    setOpeningMonths(loadedMonths);
    setYearRound(isResidence ? true : isYearRound(initialData?.openingMonths));
    setSeasonalHours(isResidence ? [] : initialData?.seasonalHours ?? []);
    setNotes(initialData?.notes ?? "");
    setPhotoUrl(initialData?.photoUrl ?? "");
    setWebsiteUrl(initialData?.websiteUrl ?? "");
    setErrors({});
    setTouched({});
    setIs24h(isResidence ? true : isAllDay24h(loadedHours));
    // Pre-fill just the location (e.g. from a dropped map pin) without entering edit
    // mode — reuses the same reverse-geocode auto-fill as a user-driven map click.
    if (!initialData && initialCoordinates) {
      handleCoordinatesChange(initialCoordinates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handle24hToggle(checked: boolean) {
    setIs24h(checked);
    if (checked) setOpeningHours(build24hHours());
  }

  function handleHoursChange(hours: OpeningHours) {
    setIs24h(false);
    setOpeningHours(hours);
  }

  function addSeasonalHoursEntry() {
    setSeasonalHours((prev) => [
      ...prev,
      { id: `new-${Date.now()}-${prev.length}`, start: null, end: null, hours: buildInitialHours() },
    ]);
  }

  function removeSeasonalHoursEntry(id: string) {
    setSeasonalHours((prev) => prev.filter((entry) => entry.id !== id));
  }

  function updateSeasonalHoursRange(id: string, start: SeasonalHoursEntry["start"], end: SeasonalHoursEntry["end"]) {
    setSeasonalHours((prev) => prev.map((entry) => (entry.id === id ? { ...entry, start, end } : entry)));
  }

  function updateSeasonalHoursGrid(id: string, hours: OpeningHours) {
    setSeasonalHours((prev) => prev.map((entry) => (entry.id === id ? { ...entry, hours } : entry)));
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = "Attraction name is required";
    // A child inherits country/city/coordinates from its parent — only required directly
    // when there's no parent to inherit them from (mirrors the backend rule).
    if (!country && !parentAttractionId) errs.country = "Country is required";
    if (selectedTypes.length === 0) errs.types = "Select at least one type";
    if (!isValidUrl(websiteUrl)) errs.websiteUrl = "Enter a valid URL (e.g. https://example.com)";
    return errs;
  }

  function handleSelectParent(attraction: Attraction) {
    setParentAttractionId(attraction._id);
    setParentAttractionName(attraction.name);
  }

  function handleClearParent() {
    setParentAttractionId(null);
    setParentAttractionName(null);
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

  // Helpers for managing days in price tiers
  const DAY_OPTIONS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  function getDaysModeForTier(tier: PriceTierDraft): "any" | "weekday" | "weekend" | "custom" {
    if (tier.days.length === 0) return "any";
    if (tier.days.length === 1) {
      if (tier.days[0] === "weekday") return "weekday";
      if (tier.days[0] === "weekend") return "weekend";
    }
    return "custom";
  }

  function getDaysSummary(tier: PriceTierDraft): string {
    const mode = getDaysModeForTier(tier);
    if (mode === "any") return "Any day";
    if (mode === "weekday") return "Weekdays";
    if (mode === "weekend") return "Weekends";
    if (tier.days.length === 0) return "Select days";
    return tier.days.map((d) => d.slice(0, 3)).join(", ");
  }

  function setDaysMode(tierIndex: number, mode: "any" | "weekday" | "weekend" | "custom") {
    setPriceTiers((prev) =>
      prev.map((t, ti) =>
        ti === tierIndex
          ? {
              ...t,
              days:
                mode === "any"
                  ? []
                  : mode === "weekday"
                    ? ["weekday"]
                    : mode === "weekend"
                      ? ["weekend"]
                      : t.days,
            }
          : t
      )
    );
  }

  function toggleDayInCustom(tierIndex: number, day: string) {
    setPriceTiers((prev) =>
      prev.map((t, ti) =>
        ti === tierIndex
          ? {
              ...t,
              days: t.days.includes(day)
                ? t.days.filter((d) => d !== day)
                : [...t.days, day],
            }
          : t
      )
    );
  }

  async function handleSave() {
    const allTouched = { name: true, country: true, types: true, websiteUrl: true };
    setTouched(allTouched);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const validTiers = priceTiers.filter((t) => t.label.trim() && t.amount != null);
    const primaryTier = validTiers.find((t) => t.isPrimary) ?? validTiers[0];
    const data: AttractionFormData = {
      name: name.trim(),
      country,
      city: city.trim(),
      coordinates,
      types: selectedTypes,
      foodStyles: isDining ? selectedFoodStyles : [],
      durationValue,
      durationUnit,
      price: primaryTier?.amount ?? null,
      prices: validTiers.length
        ? validTiers.map((t) => ({
            product: t.product.trim() || undefined,
            label: t.label.trim(),
            amount: t.amount!,
            isPrimary: t === primaryTier,
            visitorType: t.visitorType.trim() || undefined,
            days: t.days.length > 0 ? t.days : undefined,
          }))
        : undefined,
      currency,
      openingHours,
      openingMonths: yearRound ? undefined : openingMonths,
      seasonalHours: (() => {
        const complete = seasonalHours.filter((entry) => entry.start !== null && entry.end !== null);
        return complete.length
          ? complete.map((entry) => ({ start: entry.start!, end: entry.end!, hours: entry.hours }))
          : undefined;
      })(),
      notes,
      photoUrl,
      websiteUrl: websiteUrl.trim(),
      parentAttractionId,
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
    setParentAttractionId(null);
    setParentAttractionName(null);
    setSelectedTypes([]);
    setDurationValue("");
    setDurationUnit("hours");
    setPriceTiers([{ product: "", label: "Regular", amount: null, isPrimary: true, visitorType: "", days: [] }]);
    setExpandedTierIndex(null);
    setCurrency("USD");
    setOpeningHours(buildInitialHours());
    setOpeningMonths(ALL_MONTHS);
    setYearRound(true);
    setSeasonalHours([]);
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
    <>
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

      {/* Located inside (parent attraction) — only offered when there's a token to search
          with (e.g. not the new-trip inline picker, which has no DB-backed country context). */}
      {token && (
        <div className={styles.field}>
          <label className={styles.labelWithIcon}>
            <Building2 size={14} aria-hidden="true" />
            Located inside (optional)
          </label>
          {parentAttractionId && parentAttractionName ? (
            <div className={styles.parentChip}>
              <Building2 size={14} aria-hidden="true" />
              <span className={styles.parentChipName}>{parentAttractionName}</span>
              <button type="button" className={styles.parentChipBtn} onClick={() => setParentPickerOpen(true)}>
                Change
              </button>
              <button type="button" className={styles.parentChipBtn} onClick={handleClearParent}>
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.pickParentBtn}
              onClick={() => setParentPickerOpen(true)}
              disabled={!country && !defaultCountry}
              title={!country && !defaultCountry ? "Choose a country first" : undefined}
            >
              <Search size={14} aria-hidden="true" />
              Choose existing attraction…
            </button>
          )}
        </div>
      )}

      {/* Country/City/Location are inherited from the parent once one is picked — a
          nested attraction's place is defined by its parent, not independently. */}
      {!parentAttractionId && (
        <>
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
        </>
      )}

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

      {/* Food styles — only for dining-type attractions */}
      {isDining && (
        <div className={styles.field}>
          <span className={styles.labelWithIcon}>
            <UtensilsCrossed size={14} aria-hidden="true" />
            Food styles
          </span>
          {foodStyleOptions.length > 0 ? (
            <div className={styles.foodStyleChips} role="group" aria-label="Food styles">
              {foodStyleOptions.map((fs) => {
                const active = selectedFoodStyles.includes(fs.name);
                return (
                  <button
                    key={fs._id}
                    type="button"
                    className={`${styles.foodStyleChip} ${active ? styles.foodStyleChipActive : ""}`}
                    aria-pressed={active}
                    onClick={() =>
                      setSelectedFoodStyles((prev) =>
                        active ? prev.filter((n) => n !== fs.name) : [...prev, fs.name]
                      )
                    }
                  >
                    {fs.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className={styles.hint}>
              No food styles defined yet — add some from the Food Styles section in /admin.
            </p>
          )}
        </div>
      )}

      {/* Location — inherited from the parent once one is picked, so there's nothing
          independent to place on a map. */}
      {!parentAttractionId && (
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
      )}

      {/* Duration — omitted for a residence: duration is a per-trip stay concern
          (see AddResidenceModal/IScheduleEntry), not a shared-document one. */}
      {!isEditingResidence && (
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
      )}

      {/* Price — omitted for a residence: price is a per-trip stay concern, edited via
          AddResidenceModal within the trip, not here. One shared currency for every tier;
          exactly one tier is the "primary" rate shown wherever a single price is displayed. */}
      {!isEditingResidence && (
        <div className={styles.field}>
          <span className={styles.labelWithIcon}>
            <Wallet size={14} aria-hidden="true" />
            Price
          </span>
          <div className={styles.priceRow}>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>
          <div className={styles.priceTierEditor}>
            {/* Desktop Grid Header */}
            <div className={styles.priceTierHeader}>
              <div className={styles.priceTierHeaderCell}>Product</div>
              <div className={styles.priceTierHeaderCell}>Tier</div>
              <div className={styles.priceTierHeaderCell}>Visitor Type</div>
              <div className={styles.priceTierHeaderCell}>Price</div>
              <div className={styles.priceTierHeaderCell}>Days</div>
              <div className={styles.priceTierHeaderCell}></div>
            </div>
            {/* Tiers: Grid (desktop) or Cards (mobile) */}
            {priceTiers.map((tier, i) => {
              const daysMode = getDaysModeForTier(tier);
              const isExpanded = expandedTierIndex === i;
              return (
                <div
                  key={i}
                  className={`${styles.priceTierRow} ${isExpanded ? styles.priceTierRowExpanded : ""}`}
                >
                  {/* DESKTOP LAYOUT (≥768px) - Grid columns */}
                  {/* Product - Expandable */}
                  <div className={`${styles.expandableFieldWrapper} ${styles.desktopOnly}`}>
                    {expandedTextField === `product-${i}` ? (
                      <textarea
                        value={tier.product}
                        onChange={(e) =>
                          setPriceTiers((prev) => prev.map((t, ti) => (ti === i ? { ...t, product: e.target.value } : t)))
                        }
                        placeholder="e.g. Galaxy 3-hour tour"
                        className={styles.expandableTextarea}
                        aria-label="Product name"
                        onBlur={() => setExpandedTextField(null)}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className={styles.expandableFieldTrigger}
                        onClick={() => setExpandedTextField(`product-${i}`)}
                        aria-label="Edit product"
                      >
                        {tier.product || "Product"}
                      </button>
                    )}
                  </div>
                  {/* Tier - Expandable */}
                  <div className={`${styles.expandableFieldWrapper} ${styles.desktopOnly}`}>
                    {expandedTextField === `tier-${i}` ? (
                      <textarea
                        value={tier.label}
                        onChange={(e) =>
                          setPriceTiers((prev) => prev.map((t, ti) => (ti === i ? { ...t, label: e.target.value } : t)))
                        }
                        placeholder="e.g. 3h, Half-day"
                        className={styles.expandableTextarea}
                        aria-label="Tier description"
                        onBlur={() => setExpandedTextField(null)}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className={styles.expandableFieldTrigger}
                        onClick={() => setExpandedTextField(`tier-${i}`)}
                        aria-label="Edit tier"
                      >
                        {tier.label || "Tier"}
                      </button>
                    )}
                  </div>
                  {/* Visitor Type - Expandable */}
                  <div className={`${styles.expandableFieldWrapper} ${styles.desktopOnly}`}>
                    {expandedTextField === `visitorType-${i}` ? (
                      <textarea
                        value={tier.visitorType}
                        onChange={(e) =>
                          setPriceTiers((prev) => prev.map((t, ti) => (ti === i ? { ...t, visitorType: e.target.value } : t)))
                        }
                        placeholder="e.g. Adult, Child"
                        className={styles.expandableTextarea}
                        aria-label="Visitor type"
                        onBlur={() => setExpandedTextField(null)}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className={styles.expandableFieldTrigger}
                        onClick={() => setExpandedTextField(`visitorType-${i}`)}
                        aria-label="Edit visitor type"
                      >
                        {tier.visitorType || "Visitor type"}
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={tier.amount ?? ""}
                    onChange={(e) =>
                      setPriceTiers((prev) =>
                        prev.map((t, ti) => (ti === i ? { ...t, amount: e.target.value === "" ? null : parseFloat(e.target.value) } : t))
                      )
                    }
                    className={`${styles.priceTierCell} ${styles.priceInput} ${styles.desktopOnly}`}
                    aria-label="Price amount"
                  />
                  <div className={`${styles.priceTierDaysCell} ${styles.desktopOnly}`}>
                    <button
                      type="button"
                      className={styles.daysTriggerBtn}
                      onClick={() => setCustomDaysPopupIndex(i)}
                      aria-haspopup="dialog"
                      aria-expanded={customDaysPopupIndex === i}
                    >
                      <Calendar size={13} aria-hidden="true" />
                      <span className={styles.daysTriggerText}>{getDaysSummary(tier)}</span>
                    </button>
                  </div>
                  {customDaysPopupIndex === i && (
                    <>
                      <div className={styles.customDaysOverlay} onClick={() => setCustomDaysPopupIndex(null)} />
                      <div className={styles.customDaysPopup}>
                      <div className={styles.customDaysPopupHeader}>
                        <h3 className={styles.customDaysPopupTitle}>Days</h3>
                        <button
                          type="button"
                          className={styles.customDaysPopupClose}
                          onClick={() => setCustomDaysPopupIndex(null)}
                          aria-label="Close"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className={styles.customDaysPopupBody}>
                        <div className={styles.daysModeButtons}>
                          <button
                            type="button"
                            className={`${styles.daysModeBtn} ${daysMode === "any" ? styles.dayModeBtnActive : ""}`}
                            onClick={() => setDaysMode(i, "any")}
                            aria-pressed={daysMode === "any"}
                          >
                            Any day
                          </button>
                          <button
                            type="button"
                            className={`${styles.daysModeBtn} ${daysMode === "weekday" ? styles.dayModeBtnActive : ""}`}
                            onClick={() => setDaysMode(i, "weekday")}
                            aria-pressed={daysMode === "weekday"}
                          >
                            Weekdays
                          </button>
                          <button
                            type="button"
                            className={`${styles.daysModeBtn} ${daysMode === "weekend" ? styles.dayModeBtnActive : ""}`}
                            onClick={() => setDaysMode(i, "weekend")}
                            aria-pressed={daysMode === "weekend"}
                          >
                            Weekends
                          </button>
                        </div>
                        <div className={styles.customDaysPopupDivider}>
                          <span>or pick specific days</span>
                        </div>
                        <div className={styles.customDaysPopupGrid}>
                          {DAY_OPTIONS.map((day) => (
                            <label key={day} className={styles.dayCheckboxLabel}>
                              <input
                                type="checkbox"
                                checked={tier.days.includes(day)}
                                onChange={() => toggleDayInCustom(i, day)}
                                aria-label={day}
                              />
                              {day}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className={styles.customDaysPopupFooter}>
                        <button
                          type="button"
                          className={styles.customDaysPopupDone}
                          onClick={() => setCustomDaysPopupIndex(null)}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                    </>
                  )}
                  <div className={`${styles.priceTierActions} ${styles.desktopOnly}`}>
                    <button
                      type="button"
                      className={`${styles.priceTierPrimaryBtn} ${tier.isPrimary ? styles.priceTierPrimaryBtnActive : ""}`}
                      onClick={() =>
                        setPriceTiers((prev) => prev.map((t, ti) => ({ ...t, isPrimary: ti === i })))
                      }
                      title={tier.isPrimary ? "Primary rate" : "Set as primary rate"}
                      aria-pressed={tier.isPrimary}
                      aria-label={tier.isPrimary ? "Primary rate" : "Set as primary rate"}
                    >
                      <Check size={12} aria-hidden="true" />
                    </button>
                    {priceTiers.length > 1 && (
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() =>
                          setPriceTiers((prev) => {
                            const next = prev.filter((_, ti) => ti !== i);
                            if (prev[i].isPrimary && next.length > 0) next[0] = { ...next[0], isPrimary: true };
                            return next;
                          })
                        }
                        aria-label={`Remove ${tier.label || "tier"}`}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {/* MOBILE LAYOUT (<768px) - Card with summary/expanded view */}
                  <div className={`${styles.priceTierCardWrapper} ${styles.mobileOnly}`}>
                    {/* Collapsed card - summary line */}
                    <button
                      type="button"
                      className={styles.priceTierCardSummary}
                      onClick={() => setExpandedTierIndex(isExpanded ? null : i)}
                      aria-expanded={isExpanded}
                      aria-label={`Price tier: ${tier.product || tier.label}`}
                    >
                      <div className={styles.cardSummaryMain}>
                        <span className={styles.cardSummaryTitle}>
                          {tier.product || tier.label || "New tier"}
                        </span>
                        <span className={styles.cardSummaryMeta}>
                          {[tier.label, tier.visitorType, getDaysSummary(tier)].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      {tier.amount != null && (
                        <span className={styles.cardSummaryPrice}>
                          {currency} {tier.amount.toFixed(2)}
                        </span>
                      )}
                      {tier.isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                      <ChevronDown
                        size={18}
                        className={`${styles.cardExpandIcon} ${isExpanded ? styles.cardExpandIconOpen : ""}`}
                        aria-hidden="true"
                      />
                    </button>

                    {/* Expanded card - full fields */}
                    {isExpanded && (
                      <div className={styles.priceTierCardContent}>
                        <div className={styles.cardFieldRow}>
                          <div className={styles.cardFieldGroup}>
                            <label className={styles.cardFieldLabel}>Product</label>
                            <input
                              type="text"
                              value={tier.product}
                              onChange={(e) =>
                                setPriceTiers((prev) => prev.map((t, ti) => (ti === i ? { ...t, product: e.target.value } : t)))
                              }
                              placeholder="e.g. Galaxy"
                              className={styles.cardInput}
                              aria-label="Product name"
                            />
                          </div>
                          <div className={styles.cardFieldGroup}>
                            <label className={styles.cardFieldLabel}>Tier</label>
                            <input
                              type="text"
                              value={tier.label}
                              onChange={(e) =>
                                setPriceTiers((prev) => prev.map((t, ti) => (ti === i ? { ...t, label: e.target.value } : t)))
                              }
                              placeholder="e.g. 3h"
                              className={styles.cardInput}
                              aria-label="Tier description"
                            />
                          </div>
                        </div>

                        <div className={styles.cardFieldRow}>
                          <div className={styles.cardFieldGroup}>
                            <label className={styles.cardFieldLabel}>Price ({currency})</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={tier.amount ?? ""}
                              onChange={(e) =>
                                setPriceTiers((prev) =>
                                  prev.map((t, ti) => (ti === i ? { ...t, amount: e.target.value === "" ? null : parseFloat(e.target.value) } : t))
                                )
                              }
                              className={styles.cardInput}
                              aria-label="Price amount"
                            />
                          </div>
                          <div className={styles.cardFieldGroup}>
                            <label className={styles.cardFieldLabel}>Visitor Type</label>
                            <input
                              type="text"
                              value={tier.visitorType}
                              onChange={(e) =>
                                setPriceTiers((prev) => prev.map((t, ti) => (ti === i ? { ...t, visitorType: e.target.value } : t)))
                              }
                              placeholder="e.g. Adult"
                              className={styles.cardInput}
                              aria-label="Visitor type"
                            />
                          </div>
                        </div>

                        <div className={`${styles.cardFieldGroup} ${styles.cardDaysGroup}`}>
                          <label className={styles.cardFieldLabel}>Days</label>
                          <button
                            type="button"
                            className={styles.cardDaysButton}
                            onClick={() => setCustomDaysPopupIndex(i)}
                            aria-haspopup="dialog"
                            aria-expanded={customDaysPopupIndex === i}
                          >
                            <span>{getDaysSummary(tier)}</span>
                            <Calendar size={16} aria-hidden="true" />
                          </button>
                        </div>

                        <hr className={styles.cardDivider} />

                        {/* Actions */}
                        <div className={styles.cardActions}>
                          <button
                            type="button"
                            className={`${styles.priceTierPrimaryBtn} ${tier.isPrimary ? styles.priceTierPrimaryBtnActive : ""}`}
                            onClick={() =>
                              setPriceTiers((prev) => prev.map((t, ti) => ({ ...t, isPrimary: ti === i })))
                            }
                            title={tier.isPrimary ? "Primary rate" : "Set as primary rate"}
                            aria-pressed={tier.isPrimary}
                            aria-label={tier.isPrimary ? "Primary rate" : "Set as primary rate"}
                          >
                            <Check size={12} aria-hidden="true" />
                            Primary
                          </button>
                          {priceTiers.length > 1 && (
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.cardDeleteBtn}`}
                              onClick={() =>
                                setPriceTiers((prev) => {
                                  const next = prev.filter((_, ti) => ti !== i);
                                  if (prev[i].isPrimary && next.length > 0) next[0] = { ...next[0], isPrimary: true };
                                  return next;
                                })
                              }
                              aria-label={`Remove ${tier.label || "tier"}`}
                            >
                              <X size={16} aria-hidden="true" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              className={styles.addTierBtn}
              onClick={() =>
                setPriceTiers((prev) => [...prev, { product: "", label: "", amount: null, isPrimary: prev.length === 0, visitorType: "", days: [] }])
              }
            >
              + Add price tier
            </button>
          </div>
        </div>
      )}

      {/* Opening Hours — omitted for a residence: always treated as open 24/7, no
          per-day pickers needed. */}
      {!isEditingResidence && (
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
      )}

      {/* Opening Months — omitted for a residence: always treated as year-round. */}
      {!isEditingResidence && (
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.labelWithIcon}>
              <Calendar size={14} aria-hidden="true" />
              Opening Months
            </span>
            <button
              type="button"
              role="checkbox"
              aria-checked={yearRound}
              className={`${styles.toggle24h} ${yearRound ? styles.toggle24hActive : ""}`}
              onClick={() => setYearRound(!yearRound)}
            >
              Year-round
            </button>
          </div>
          {!yearRound && <MonthsGrid value={openingMonths} onChange={setOpeningMonths} />}
        </div>
      )}

      {/* Seasonal Hours — optional per-date-range overrides on top of the base Opening
          Hours above (e.g. longer summer hours). Omitted for a residence, same as Opening
          Hours/Months. Leaving this empty means Opening Hours applies to every date, all
          year, exactly as before this feature existed. */}
      {!isEditingResidence && (
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.labelWithIcon}>
              <Calendar size={14} aria-hidden="true" />
              Seasonal Hours (optional)
            </span>
          </div>
          <p className={styles.helperText}>
            Add a date range with different hours than usual (e.g. summer 9–20, rest of the year 10–18).
            Leave empty if hours are the same all year.
          </p>
          {seasonalHours.map((entry, i) => (
            <div key={entry.id} className={styles.seasonalHoursEntry}>
              <div className={styles.seasonalHoursEntryHeader}>
                <span className={styles.seasonalHoursEntryTitle}>Season {i + 1}</span>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => removeSeasonalHoursEntry(entry.id)}
                  aria-label={`Remove season ${i + 1}`}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
              <SeasonalRangePicker
                start={entry.start}
                end={entry.end}
                onChange={(start, end) => updateSeasonalHoursRange(entry.id, start, end)}
              />
              <OpeningHoursGrid
                value={entry.hours}
                onChange={(hours) => updateSeasonalHoursGrid(entry.id, hours)}
              />
            </div>
          ))}
          <button type="button" className={styles.addTierBtn} onClick={addSeasonalHoursEntry}>
            <Plus size={14} aria-hidden="true" />
            Add seasonal hours
          </button>
        </div>
      )}

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

    {token && (
      <ParentAttractionPicker
        isOpen={parentPickerOpen}
        onClose={() => setParentPickerOpen(false)}
        country={defaultCountry || country}
        token={token}
        excludeAttractionId={editingAttractionId}
        onSelect={handleSelectParent}
      />
    )}
    </>
  );
}
