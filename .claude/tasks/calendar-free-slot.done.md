# Task: Calendar Free Slot

Status: done

Track: A
Track reason: new modal form + new calendar block visual — no existing pattern covers a non-attraction schedule entry

## Problem
Trip planners need to block out time on their day calendar for things that aren't specific attractions: lunch breaks, transit, hotel check-in, rest periods, spontaneous wandering. Right now every calendar block must be a full attraction (with country, city, location, opening hours, photo). There's no lightweight "placeholder" slot, so informal time blocks either go untracked or require creating a fake attraction with bogus location data.

## Goal
A user on the trip detail Calendar tab can add a named free time slot — with a start time, duration, type, price, and notes — that appears in the day view alongside their attractions without cluttering the Attractions list.

## Requirements

### Functional
- "Add free slot" trigger in the Calendar section, visible to `canEdit` users
- Modal fields:
  - **Label** (text input, required) — e.g. "Lunch", "Metro to hotel", "Check-in"
  - **Planned date** (date, required)
  - **Start time** (time, required, HH:MM)
  - **Duration** — value (number) + unit (hours / minutes)
  - **Type** — single-select from the existing attraction types list (optional)
  - **Price** + **currency** (optional, same pattern as attraction modal)
  - **Notes** (textarea, optional)
- Excluded fields: photoUrl, city, country, coordinates, opening hours
- On save: POST to `/api/trips/[id]/attractions` with `subtype: "free-slot"` so it flows through existing trip-attraction infrastructure; no new endpoints needed
- Free slots appear in the Calendar day view with a visually distinct treatment (clearly NOT a regular attraction block)
- Free slots are excluded from the Attractions tab list (same filtering pattern as residences and flights)
- Edit and remove from the calendar use the same PATCH/DELETE mechanics as other scheduled items
- Free slots participate in overlap conflict alerts

### Non-functional
- Responsive: 320px mobile through 1280px desktop
- Accessible: keyboard navigable modal, visible focus states, proper `<label>` on every field, focus returns to trigger on close

## Constraints
- CSS Modules only — no Tailwind, no inline styles
- No new API endpoints; no new DB model fields — `subtype`, `name`, `plannedDate`, `plannedTime`, `actualDurationValue`, `actualDurationUnit`, `types`, `price`, `currency`, `notes` all exist on Attraction
- Reuse existing form field patterns (see `AddResidenceModal`, `NewAttractionModal`)
- The type selector should reuse the `useAttractionTypes` hook — no new data source
- Modal must use the portal pattern (`createPortal` to `document.body`) already established in other modals

## Out of scope
- Free slots in the Attractions, Flights, or Residences tabs
- Recurring or templated free slots
- Map pin / location for free slots
- Showing free slots on the Explore page

---

## Design Brief

### Summary of changes

| Area | What changes |
|------|-------------|
| `src/types/attraction.ts` | Add `"free-slot"` to the `subtype` union |
| `src/app/api/trips/[id]/attractions/route.ts` | Allow `"free-slot"` in body type; skip name-dedup + relax country/city requirement for free slots |
| `src/components/AddFreeSlotModal/` | **New component** — modal with 6 fields (label, date, time, duration, type, price, notes) |
| `src/components/index.ts` | Export `AddFreeSlotModal` |
| `src/app/trips/[id]/CalendarSection.tsx` | Add trigger button; wire new state + handlers; render free slot blocks with amber style + `Clock` icon; click → edit modal |
| `src/app/trips/[id]/CalendarSection.module.css` | Add `.addFreeSlotBtn`, `.blockFreeSlot` |
| `swagger.yaml` | Add `"free-slot"` to subtype enum |

---

### 1. Type changes

**`src/types/attraction.ts`**

```ts
// Before:
subtype?: "residence" | "flight";
// After:
subtype?: "residence" | "flight" | "free-slot";
```

---

### 2. Backend changes — `src/app/api/trips/[id]/attractions/route.ts`

Two targeted changes, nothing else:

**a) Allow `"free-slot"` in subtype:**
```ts
// POST body type, line ~97:
subtype?: "residence" | "flight" | "free-slot";
```

**b) Relax validation for free slots:**
The existing check `if (!name?.trim() || !country?.trim() || !city?.trim())` fails when country/city are omitted. For free slots, default them to the trip country and skip the name dedup lookup:

```ts
// After extracting body fields, add this block before the existing else-branch logic:
if (subtype === "free-slot") {
  // Free slots don't need a location — use trip country as a placeholder so the DB constraint is satisfied
  const freeSlotCountry = country?.trim() || "—";
  const freeSlotCity    = city?.trim()    || "—";
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  // Always create a new document (no name dedup — "Lunch" should create independent instances)
  const typeIds = types?.length
    ? (await AttractionType.find({ name: { $in: types } }).select("_id")).map((d) => d._id)
    : [];
  attraction = await Attraction.create({
    ownerId: payload.userId,
    name: name.trim(),
    country: freeSlotCountry,
    city: freeSlotCity,
    types: typeIds,
    price: price ?? null,
    currency: currency || "USD",
    notes: notes || undefined,
    subtype: "free-slot",
  });
  // Fall through to the scheduling + trip.save() block below
}
```

Place this `if (subtype === "free-slot")` block after the `const { existingAttractionId, ... } = body;` destructure and before `if (existingAttractionId)`. This means the existing `if (existingAttractionId) { ... } else { ... }` block runs only when `subtype !== "free-slot"`.

The schedule fields (`plannedDate`, `plannedTime`, `actualDurationValue`, `actualDurationUnit`) are already handled after the attraction is set — they will apply to free slots too via the existing `scheduleEntry` + `trip.schedules.set(...)` logic.

---

### 3. New component — `AddFreeSlotModal`

**File structure:**
```
src/components/AddFreeSlotModal/
├── AddFreeSlotModal.tsx
├── AddFreeSlotModal.module.css
└── AddFreeSlotModal.types.ts
```

---

#### 3a. `AddFreeSlotModal.types.ts`

```ts
export interface FreeSlotFormData {
  name: string;
  plannedDate: string;         // "YYYY-MM-DD"
  plannedTime: string;         // "HH:MM"
  actualDurationValue?: string;
  actualDurationUnit?: "hours" | "minutes";
  types: string[];             // 0 or 1 element (the type name, not ID)
  price: number | null;
  currency: string;
  notes?: string;
}

export interface FreeSlotInitialData extends FreeSlotFormData {}

export interface AddFreeSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FreeSlotFormData) => Promise<void>;
  tripStartDate: string;
  tripEndDate: string;
  currency: string;
  initialData?: FreeSlotInitialData;
}
```

---

#### 3b. `AddFreeSlotModal.module.css`

Copy verbatim from `AddResidenceModal.module.css`. All tokens, class names, and layout patterns are identical. No new values needed.

The only additions:
```css
/* Date + time inputs side by side */
.dateTimeRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 480px) {
  .dateTimeRow { grid-template-columns: 1fr; }
}

/* Duration value + unit side by side */
.durationRow {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.durationUnit {
  height: 44px;
  padding: 0 10px 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-primary);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  min-width: 100px;
  transition: border-color var(--duration-fast) var(--easing-out),
              box-shadow var(--duration-fast) var(--easing-out);
}
.durationUnit:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
```

---

#### 3c. `AddFreeSlotModal.tsx` — exact specification

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Coffee, Tag, Calendar, Clock, Wallet, FileText, ChevronDown, AlertCircle, Loader2, Check,
} from "lucide-react";
import { CurrencySelect } from "@/components/CurrencySelect/CurrencySelect";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";
import type { AddFreeSlotModalProps, FreeSlotFormData } from "./AddFreeSlotModal.types";
import styles from "./AddFreeSlotModal.module.css";

const HEADING_ID = "add-free-slot-modal-title";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

interface FieldErrors {
  name?: string;
  plannedDate?: string;
  plannedTime?: string;
}

function toDateValue(isoString: string): string {
  try { return new Date(isoString).toISOString().split("T")[0]; } catch { return ""; }
}

export function AddFreeSlotModal({
  isOpen, onClose, onSave,
  tripStartDate, tripEndDate, currency,
  initialData,
}: AddFreeSlotModalProps) {
  const isEditMode = !!initialData;
  const { types: allTypes } = useAttractionTypes();

  const [name, setName]                         = useState("");
  const [plannedDate, setPlannedDate]           = useState("");
  const [plannedTime, setPlannedTime]           = useState("");
  const [durationValue, setDurationValue]       = useState("");
  const [durationUnit, setDurationUnit]         = useState<"hours" | "minutes">("hours");
  const [selectedType, setSelectedType]         = useState("");  // type name string or ""
  const [price, setPrice]                       = useState<number | null>(null);
  const [priceCurrency, setPriceCurrency]       = useState(currency ?? "USD");
  const [notes, setNotes]                       = useState("");
  const [errors, setErrors]                     = useState<FieldErrors>({});
  const [touched, setTouched]                   = useState<Record<string, boolean>>({});
  const [saving, setSaving]                     = useState(false);
  const [mounted, setMounted]                   = useState(false);

  const dialogRef     = useRef<HTMLDivElement>(null);
  const triggerRef    = useRef<HTMLElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name ?? "");
    setPlannedDate(initialData?.plannedDate ?? "");
    setPlannedTime(initialData?.plannedTime ?? "");
    setDurationValue(initialData?.actualDurationValue ?? "");
    setDurationUnit(initialData?.actualDurationUnit ?? "hours");
    setSelectedType(initialData?.types?.[0] ?? "");
    setPrice(initialData?.price ?? null);
    setPriceCurrency(initialData?.currency ?? currency ?? "USD");
    setNotes(initialData?.notes ?? "");
    setErrors({});
    setTouched({});
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => firstInputRef.current?.focus());
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Tab" && dialogRef.current) {
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const tripStart = toDateValue(tripStartDate);
  const tripEnd   = toDateValue(tripEndDate);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!name.trim())     errs.name        = "Label is required";
    if (!plannedDate)     errs.plannedDate  = "Date is required";
    if (!plannedTime)     errs.plannedTime  = "Start time is required";
    return errs;
  }

  function handleBlur(field: keyof FieldErrors) {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors(validate());
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSave() {
    setTouched({ name: true, plannedDate: true, plannedTime: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const data: FreeSlotFormData = {
      name: name.trim(),
      plannedDate,
      plannedTime,
      actualDurationValue: durationValue || undefined,
      actualDurationUnit:  durationValue ? durationUnit : undefined,
      types: selectedType ? [selectedType] : [],
      price,
      currency: priceCurrency,
      notes: notes || undefined,
    };
    await Promise.resolve(onSave(data));
    setSaving(false);
    onClose();
  }

  if (!mounted || !isOpen) return null;

  const formIsValid = Object.keys(validate()).length === 0;

  const modal = (
    <div className={styles.backdrop} onClick={handleBackdropClick} aria-hidden="true">
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
            <Coffee size={18} aria-hidden="true" className={styles.titleIcon} />
            {isEditMode ? "Edit Free Slot" : "Add Free Slot"}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Label */}
          <div className={styles.field}>
            <label htmlFor="slot-name" className={styles.labelWithIcon}>
              <Tag size={14} aria-hidden="true" />
              Label <span className={styles.required} aria-hidden="true">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="slot-name"
              type="text"
              placeholder="e.g. Lunch break, Metro to hotel, Check-in"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur("name")}
              className={`${styles.input} ${touched.name && errors.name ? styles.inputError : ""}`}
              aria-required="true"
              aria-describedby={touched.name && errors.name ? "slot-err-name" : undefined}
            />
            {touched.name && errors.name && (
              <p id="slot-err-name" className={styles.errorMsg} role="alert">
                <AlertCircle size={12} aria-hidden="true" />{errors.name}
              </p>
            )}
          </div>

          {/* Date + Time */}
          <div className={styles.dateTimeRow}>
            <div className={styles.field}>
              <label htmlFor="slot-date" className={styles.labelWithIcon}>
                <Calendar size={14} aria-hidden="true" />
                Date <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="slot-date"
                type="date"
                value={plannedDate}
                min={tripStart}
                max={tripEnd}
                onChange={(e) => setPlannedDate(e.target.value)}
                onBlur={() => handleBlur("plannedDate")}
                className={`${styles.input} ${touched.plannedDate && errors.plannedDate ? styles.inputError : ""}`}
                aria-required="true"
                aria-describedby={touched.plannedDate && errors.plannedDate ? "slot-err-date" : undefined}
              />
              {touched.plannedDate && errors.plannedDate && (
                <p id="slot-err-date" className={styles.errorMsg} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />{errors.plannedDate}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="slot-time" className={styles.labelWithIcon}>
                <Clock size={14} aria-hidden="true" />
                Start time <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="slot-time"
                type="time"
                value={plannedTime}
                onChange={(e) => setPlannedTime(e.target.value)}
                onBlur={() => handleBlur("plannedTime")}
                className={`${styles.input} ${touched.plannedTime && errors.plannedTime ? styles.inputError : ""}`}
                aria-required="true"
                aria-describedby={touched.plannedTime && errors.plannedTime ? "slot-err-time" : undefined}
              />
              {touched.plannedTime && errors.plannedTime && (
                <p id="slot-err-time" className={styles.errorMsg} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />{errors.plannedTime}
                </p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className={styles.field}>
            <label className={styles.labelWithIcon}>
              <Clock size={14} aria-hidden="true" />
              Duration
            </label>
            <div className={styles.durationRow}>
              <input
                id="slot-dur-value"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 1.5"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className={styles.input}
                aria-label="Duration value"
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as "hours" | "minutes")}
                className={styles.durationUnit}
                aria-label="Duration unit"
              >
                <option value="hours">hours</option>
                <option value="minutes">minutes</option>
              </select>
            </div>
          </div>

          {/* Type (optional) */}
          <div className={styles.field}>
            <label htmlFor="slot-type" className={styles.labelWithIcon}>
              <Tag size={14} aria-hidden="true" />
              Type
            </label>
            <div className={styles.selectWrapper}>
              <select
                id="slot-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className={styles.select}
              >
                <option value="">— none —</option>
                {allTypes.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className={styles.selectIcon} aria-hidden="true" />
            </div>
          </div>

          {/* Price */}
          <div className={styles.field}>
            <label className={styles.labelWithIcon}>
              <Wallet size={14} aria-hidden="true" />
              Price
            </label>
            <div className={styles.priceRow}>
              <CurrencySelect value={priceCurrency} onChange={setPriceCurrency} />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price ?? ""}
                onChange={(e) => setPrice(e.target.value === "" ? null : parseFloat(e.target.value))}
                className={styles.priceInput}
                aria-label="Price amount"
              />
            </div>
          </div>

          {/* Notes */}
          <div className={styles.field}>
            <label htmlFor="slot-notes" className={styles.labelWithIcon}>
              <FileText size={14} aria-hidden="true" />
              Notes
            </label>
            <textarea
              id="slot-notes"
              rows={3}
              placeholder="e.g. Pre-booked restaurant, bring confirmation email"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.textarea}
            />
          </div>

        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
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
              <><Loader2 size={15} className={styles.spinner} aria-hidden="true" />Saving…</>
            ) : (
              <><Check size={15} aria-hidden="true" />{isEditMode ? "Save Changes" : "Add Slot"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
```

---

### 4. `src/components/index.ts`

Add: `export { AddFreeSlotModal } from "./AddFreeSlotModal/AddFreeSlotModal";`

---

### 5. `CalendarSection.tsx` changes

#### 5a. New imports
```tsx
import { ..., Plus, Coffee } from "lucide-react";
import { AddFreeSlotModal } from "@/components/AddFreeSlotModal/AddFreeSlotModal";
import type { FreeSlotFormData } from "@/components/AddFreeSlotModal/AddFreeSlotModal.types";
```

#### 5b. New state in `CalendarSection`
```tsx
const [freeSlotModalOpen, setFreeSlotModalOpen]   = useState(false);
const [editingFreeSlot, setEditingFreeSlot]       = useState<Attraction | null>(null);
```

#### 5c. Handler: `handleFreeSlotSave`
```tsx
async function handleFreeSlotSave(data: FreeSlotFormData) {
  if (!token) return;
  try {
    const res = await fetch(`/api/trips/${trip._id}/attractions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name:                data.name,
        subtype:             "free-slot",
        country:             trip.country,
        city:                trip.country,
        types:               data.types,
        price:               data.price,
        currency:            data.currency,
        notes:               data.notes,
        plannedDate:         data.plannedDate,
        plannedTime:         data.plannedTime,
        actualDurationValue: data.actualDurationValue,
        actualDurationUnit:  data.actualDurationUnit,
      }),
    });
    if (res.ok) {
      const created = (await res.json()) as Attraction;
      applyLocal([created, ...local]);
    }
  } catch { /* silent */ }
}
```

#### 5d. Handler: `handleFreeSlotUpdate`
```tsx
async function handleFreeSlotUpdate(data: FreeSlotFormData) {
  if (!token || !editingFreeSlot) return;
  const id = editingFreeSlot._id;
  setEditingFreeSlot(null);
  try {
    // Update attraction-level fields
    await fetch(`/api/attractions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name:    data.name,
        subtype: "free-slot",
        country: trip.country,
        city:    trip.country,
        types:   data.types,
        price:   data.price,
        currency: data.currency,
        notes:   data.notes,
      }),
    });
    // Update schedule
    const schedRes = await fetch(`/api/trips/${trip._id}/attractions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        plannedDate:         data.plannedDate,
        plannedTime:         data.plannedTime,
        actualDurationValue: data.actualDurationValue,
        actualDurationUnit:  data.actualDurationUnit,
      }),
    });
    if (schedRes.ok) {
      const updated = (await schedRes.json()) as Attraction;
      applyLocal(local.map((a) => a._id !== updated._id ? a : updated));
    }
  } catch { /* silent */ }
}
```

#### 5e. Derived variable inside the block render loop
```tsx
// Add after: const isFlight = ...
const isFreeSlot = a.subtype === "free-slot";
```

#### 5f. Block color override for free slots
```tsx
// Change:
const color = colorForType(a.types?.[0] ?? "");
// To:
const color = isFreeSlot ? "var(--color-accent)" : colorForType(a.types?.[0] ?? "");
```

#### 5g. Block icon fallback for free slots
```tsx
// Change:
const icon = renderTypeIcon(findType(a.types?.[0] ?? "")?.icon ?? "");
// To:
const rawIcon = renderTypeIcon(findType(a.types?.[0] ?? "")?.icon ?? "");
const icon    = (!rawIcon && isFreeSlot) ? <Coffee size={10} /> : rawIcon;
```

#### 5h. Block click handler — free slots open edit modal
```tsx
function handleBlockClick(e: React.MouseEvent) {
  if (isFreeSlot) {
    if (canEdit) setEditingFreeSlot(a);
    else setViewingAttraction(a);
    return;
  }
  if (a.subtype || isFlight) { setViewingAttraction(a); return; }
  if (canEdit) openPopup(e, a);
  else setViewingAttraction(a);
}
```

#### 5i. Block aria-label update
```tsx
aria-label={`${a.name} at ${a.plannedTime}${
  isFreeSlot && canEdit ? " — click to edit" :
  !a.subtype && !isFlight && canEdit ? " — click to edit time" :
  " — click to view details"
}`}
```

#### 5j. Block className — add `.blockFreeSlot` modifier
```tsx
className={`${styles.attractionBlock} ${isPending ? styles.blockPending : ""} ${isCompact ? styles.blockCompact : ""} ${isFreeSlot ? styles.blockFreeSlot : ""}`}
```

#### 5k. Pass `onAddFreeSlot` to `Header` in both render paths
In the `headerProps` object:
```tsx
const headerProps = {
  // ... existing ...
  onAddFreeSlot: () => setFreeSlotModalOpen(true),
};
```

In the empty-state render, pass `onAddFreeSlot={headerProps.onAddFreeSlot}` to Header.

#### 5l. Mount the modal (render at end of the CalendarSection return, alongside the existing AttractionDetailModal)
```tsx
<AddFreeSlotModal
  isOpen={freeSlotModalOpen || !!editingFreeSlot}
  onClose={() => { setFreeSlotModalOpen(false); setEditingFreeSlot(null); }}
  onSave={editingFreeSlot ? handleFreeSlotUpdate : handleFreeSlotSave}
  tripStartDate={trip.startDate}
  tripEndDate={trip.endDate}
  currency={trip.currency ?? "USD"}
  initialData={editingFreeSlot ? {
    name:                editingFreeSlot.name,
    plannedDate:         editingFreeSlot.plannedDate  ?? "",
    plannedTime:         editingFreeSlot.plannedTime  ?? "",
    actualDurationValue: editingFreeSlot.actualDurationValue ?? editingFreeSlot.durationValue ?? "",
    actualDurationUnit:  editingFreeSlot.actualDurationUnit  ?? editingFreeSlot.durationUnit  ?? "hours",
    types:               editingFreeSlot.types,
    price:               editingFreeSlot.price  ?? null,
    currency:            editingFreeSlot.currency ?? trip.currency ?? "USD",
    notes:               editingFreeSlot.notes   ?? "",
  } : undefined}
/>
```

---

### 6. `CalendarSection.module.css` additions

```css
/* ── "Add free slot" button in header ── */
.addFreeSlotBtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--easing-out),
              color var(--duration-fast) var(--easing-out);
  white-space: nowrap;
}

.addFreeSlotBtn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.addFreeSlotBtn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* ── Free slot calendar block modifier ── */
.blockFreeSlot {
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.5);
}
```

The amber background is supplied via the `--block-color` CSS variable at the JS layer (section 5f above). The `.blockFreeSlot` modifier only adds the dashed border to signal "this is a placeholder, not a venue."

---

### 7. `Header` sub-component changes in `CalendarSection.tsx`

Add `onAddFreeSlot: () => void` to `HeaderProps`.

In the `summaryBadges` div, add the button **before** the Map toggle:

```tsx
{canEdit && (
  <button type="button" className={styles.addFreeSlotBtn} onClick={onAddFreeSlot}>
    <Plus size={13} aria-hidden="true" />
    Free slot
  </button>
)}
```

---

### 8. `swagger.yaml` updates

Update the `subtype` field in the attraction POST request body and in the attraction schema to include `"free-slot"`:

```yaml
subtype:
  type: string
  enum: [residence, flight, free-slot]
  description: Attraction sub-classification
```

Apply this in both the `TripAttractionPost` request body schema and the `Attraction` response schema.

---

### Accessibility checklist
- All form fields have visible `<label>` elements with correct `htmlFor`
- Required fields marked with `*` and `aria-required="true"`
- Error messages use `role="alert"` and `aria-describedby`
- Modal traps focus (Tab/Shift-Tab cycle), Escape closes
- Focus returns to trigger element on close
- Free slot blocks have descriptive `aria-label` indicating edit affordance

### Files to create
- `src/components/AddFreeSlotModal/AddFreeSlotModal.tsx`
- `src/components/AddFreeSlotModal/AddFreeSlotModal.module.css`
- `src/components/AddFreeSlotModal/AddFreeSlotModal.types.ts`

### Files to modify
- `src/types/attraction.ts`
- `src/app/api/trips/[id]/attractions/route.ts`
- `src/components/index.ts`
- `src/app/trips/[id]/CalendarSection.tsx`
- `src/app/trips/[id]/CalendarSection.module.css`
- `swagger.yaml`

## Completion Summary
Custom time-slot feature fully implemented (renamed from "free slot" per user feedback). Slots live only in `trip.schedules` (no Attraction document), keyed with `"cs-"` prefix. Modal, calendar block, edit/delete flows, and all bug fixes (Mongoose strict-mode bypass, date range validation, empty-state modal) confirmed working. Closed 2026-07-11.

## Implementation Notes
- Files created: `src/components/AddFreeSlotModal/AddFreeSlotModal.tsx`, `AddFreeSlotModal.module.css`, `AddFreeSlotModal.types.ts`
- Files modified: `src/types/attraction.ts`, `src/models/Attraction.ts` (Mongoose model interface + schema enum also needed `"free-slot"`), `src/app/api/trips/[id]/attractions/route.ts`, `src/components/index.ts`, `src/app/trips/[id]/CalendarSection.tsx`, `CalendarSection.module.css`, `swagger.yaml`
- Deviations from brief: Mongoose model (`src/models/Attraction.ts`) was not listed in the brief but needed updating — both the TypeScript interface and the schema enum required `"free-slot"` added, otherwise `tsc --noEmit` failed with a type mismatch on `Attraction.create({ subtype: "free-slot" })`
- New design tokens used: none
