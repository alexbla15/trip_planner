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
  PriceTabDraft,
  PrimaryCellRef,
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
import { PriceTierEditor } from "./PriceTierEditor";
import { buildInitialHours, normalizeOpeningHours, hasOpeningHoursData, isAllDay24h, isValidUrl, isYearRound, ALL_MONTHS, deriveOpeningMonthsFromSeasonalHours, formatOpeningMonthsLabel } from "@/lib";
import { useReverseGeocodeAutofill, useAttractionTypes, useFoodStyles } from "@/hooks";
import { filterCityOptions, emptyPriceTab, flatPriceTiersToTabs, tabsToFlatPriceTiers } from "./NewAttractionModal.utils";
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
  const [priceTabs, setPriceTabs] = useState<PriceTabDraft[]>(() => [emptyPriceTab()]);
  const [primaryCell, setPrimaryCell] = useState<PrimaryCellRef | null>(() => {
    const tab = priceTabs[0];
    const row = tab?.rows[0];
    const column = tab?.columns[0];
    return tab && row && column ? { tabId: tab.id, rowId: row.id, columnId: column.id } : null;
  });
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
    if (initialData?.prices?.length) {
      const { tabs, primary } = flatPriceTiersToTabs(initialData.prices);
      setPriceTabs(tabs);
      setPrimaryCell(primary);
    } else if (initialData?.price != null) {
      const { tabs, primary } = flatPriceTiersToTabs([{ label: "Regular", amount: initialData.price, isPrimary: true }]);
      setPriceTabs(tabs);
      setPrimaryCell(primary);
    } else {
      // Brand-new attraction with no existing price data — a fresh tab with an empty
      // (not zero-filled) amount field, same starting point as the lazy useState default.
      const tab = emptyPriceTab();
      setPriceTabs([tab]);
      setPrimaryCell({ tabId: tab.id, rowId: tab.rows[0].id, columnId: tab.columns[0].id });
    }
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
    setSeasonalHours(
      isResidence
        ? []
        : (initialData?.seasonalHours ?? []).map((entry, i) => ({
            id: `existing-${i}`,
            start: entry.start,
            end: entry.end,
            hours: entry.hours,
          }))
    );
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

  async function handleSave() {
    const allTouched = { name: true, country: true, types: true, websiteUrl: true };
    setTouched(allTouched);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const flatTiers = tabsToFlatPriceTiers(priceTabs, primaryCell);
    const primaryTier = flatTiers.find((t) => t.isPrimary) ?? flatTiers[0];
    const completeSeasonalHours = seasonalHours
      .filter((entry): entry is typeof entry & { start: NonNullable<typeof entry.start>; end: NonNullable<typeof entry.end> } =>
        entry.start !== null && entry.end !== null)
      .map((entry) => ({ start: entry.start, end: entry.end, hours: entry.hours }));
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
      prices: flatTiers.length ? flatTiers : undefined,
      currency,
      openingHours,
      // Once any seasonal-hours entry exists, openingMonths is derived from their date
      // ranges — never independently set by the Opening Months toggle in that case (see
      // deriveOpeningMonthsFromSeasonalHours).
      openingMonths: completeSeasonalHours.length
        ? deriveOpeningMonthsFromSeasonalHours(completeSeasonalHours)
        : yearRound ? undefined : openingMonths,
      seasonalHours: completeSeasonalHours.length ? completeSeasonalHours : undefined,
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
    {
      const tab = emptyPriceTab();
      setPriceTabs([tab]);
      setPrimaryCell({ tabId: tab.id, rowId: tab.rows[0].id, columnId: tab.columns[0].id });
    }
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
  // Once any seasonal-hours entry has both dates set, Opening Months is derived from
  // those ranges — the manual Year-round toggle/grid is replaced with a read-only note.
  const seasonalHoursForMonths = seasonalHours.filter((e) => e.start !== null && e.end !== null) as
    { start: NonNullable<SeasonalHoursEntry["start"]>; end: NonNullable<SeasonalHoursEntry["end"]>; hours: OpeningHours }[];
  const hasSeasonalHours = seasonalHoursForMonths.length > 0;
  const derivedOpeningMonths = hasSeasonalHours ? deriveOpeningMonthsFromSeasonalHours(seasonalHoursForMonths) : [];

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
          <PriceTierEditor
            tabs={priceTabs}
            onChange={setPriceTabs}
            primary={primaryCell}
            onPrimaryChange={setPrimaryCell}
            currency={currency}
          />
        </div>
      )}

      {/* Opening Hours — omitted for a residence: always treated as open 24/7, no
          per-day pickers needed. Also omitted once any Seasonal Hours entry exists: each
          entry has its own full weekly hours grid, and the base schedule here is never
          used once those exist (see resolveOpeningHoursForDate) — showing it would just
          be a dead-weight duplicate of the same UI. */}
      {!isEditingResidence && !hasSeasonalHours && (
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

      {/* Opening Months — omitted for a residence: always treated as year-round. When
          Seasonal Hours entries exist, this is derived from their date ranges instead of
          being independently set — see deriveOpeningMonthsFromSeasonalHours. */}
      {!isEditingResidence && (
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.labelWithIcon}>
              <Calendar size={14} aria-hidden="true" />
              Opening Months
            </span>
            {!hasSeasonalHours && (
              <button
                type="button"
                role="checkbox"
                aria-checked={yearRound}
                className={`${styles.toggle24h} ${yearRound ? styles.toggle24hActive : ""}`}
                onClick={() => setYearRound(!yearRound)}
              >
                Year-round
              </button>
            )}
          </div>
          {hasSeasonalHours ? (
            <p className={styles.helperText}>
              Derived from your Seasonal Hours ranges below: open {formatOpeningMonthsLabel(derivedOpeningMonths)}.
            </p>
          ) : (
            !yearRound && <MonthsGrid value={openingMonths} onChange={setOpeningMonths} />
          )}
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
