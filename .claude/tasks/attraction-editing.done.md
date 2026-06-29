# Task: Attraction Editing

Status: done

Track: A
Track reason: new edit UI for each attraction row on the trip detail page — no existing edit-in-place pattern for attractions

## Problem
Attractions can be added and removed from a trip, but once created they are frozen. If a traveler mis-spells the name, enters the wrong duration, or wants to update the price after booking, they must delete and re-add the attraction entirely.

## Goal
Each attraction in the trip detail list has an "Edit" button that opens the existing `NewAttractionModal` pre-filled with the attraction's current data; saving calls `PUT /api/attractions/[id]` and updates the item in the list.

## Requirements
- Add an "Edit" button (Lucide `PenLine` icon, 14px) to each attraction row in `TripDetailClient`, alongside the existing "Remove" (Trash2) button
- Clicking "Edit" opens `NewAttractionModal` with `isOpen=true` and all fields pre-filled from the attraction's current data
- `NewAttractionModal` already has an `onSave(data: AttractionFormData)` callback — when in edit mode, the save should call `PUT /api/attractions/[id]` instead of POST
- `NewAttractionModal` needs an optional `initialData?: AttractionFormData` prop to pre-fill all fields
- On successful PUT, update the attraction in the local `attractions` state array (replace the matching item by `_id`)
- The modal title should change to "Edit Attraction" when `initialData` is provided
- The existing "New Attraction" flow (modal opened without `initialData`) must be unaffected

## Constraints
- CSS Modules only, no inline styles
- Reuse `NewAttractionModal` — no new modal component
- The attraction `_id` must be tracked to know which item to PUT and update in state
- `PUT /api/attractions/[id]` already exists — no backend changes needed

## Out of scope
- Bulk editing multiple attractions at once
- Reorder UI

---

## Design Brief

### 1. Attraction row — action buttons

Currently each row ends with a single `.removeBtn` (Trash2, 32×32px). After this change the row ends with **two buttons** grouped together:

```
[icon circle] [name / meta info ......] [edit btn] [remove btn]
```

**New `.rowActions` wrapper** (after `.attractionInfo`):
```css
.rowActions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
```

**New `.editBtn`** — identical shape to `.removeBtn` but hover colour is primary (not error):
```css
.editBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-md);
  flex-shrink: 0;
  transition: color var(--duration-fast) var(--easing-out),
    background var(--duration-fast) var(--easing-out);
}
.editBtn:hover {
  color: var(--color-primary);
  background: var(--color-bg-subtle);
}
.editBtn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

Icon: Lucide `PenLine` 14px. `aria-label={`Edit ${attraction.name}`}`.

The existing `.removeBtn` CSS is unchanged — just move it inside `.rowActions`.

---

### 2. `NewAttractionModal` — edit mode changes

**Prop addition:**
```ts
initialData?: AttractionFormData;   // when present → edit mode
```
Also add an optional `editingId?: string` prop so the save handler knows which attraction to PUT.

**Title** (`<h2>` in the modal header):
- Default (create): "New Attraction"
- Edit mode: "Edit Attraction"

**Footer save button label:**
- Default: "Save Attraction"
- Edit mode: "Save Changes"

**State initialisation** — when `initialData` is provided, each `useState` init reads from it:
```ts
const [name, setName] = useState(initialData?.name ?? "");
const [country, setCountry] = useState(initialData?.country ?? defaultCountry ?? "");
// etc. for all fields
```

**`handleReset`** — reset back to `initialData` defaults (not empty) when in edit mode:
```ts
function handleReset() {
  setName(initialData?.name ?? "");
  setCountry(initialData?.country ?? defaultCountry ?? "");
  // ... etc.
}
```

The existing `onSave(data: AttractionFormData)` callback is still used — the *caller* (`TripDetailClient`) decides whether to POST or PUT based on whether it's in edit mode.

---

### 3. `TripDetailClient` — wiring

**New state:**
```ts
const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
```

**Edit button handler** (per row):
```ts
function handleEditClick(attraction: Attraction) {
  setEditingAttraction(attraction);
}
```

**`handleAttractionUpdate`** (new handler for edit mode save):
```ts
async function handleAttractionUpdate(data: AttractionFormData) {
  if (!token || !editingAttraction) return;
  setEditingAttraction(null); // close modal immediately

  try {
    const res = await fetch(`/api/attractions/${editingAttraction._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json() as Attraction;
      setAttractions(prev => prev.map(a => a._id === updated._id ? updated : a));
    }
  } catch {
    // Silent — the old data remains
  }
}
```

**Modal render** — use a single `NewAttractionModal` instance with conditional props:
```tsx
<NewAttractionModal
  isOpen={modalOpen || editingAttraction !== null}
  onClose={() => {
    setModalOpen(false);
    setEditingAttraction(null);
  }}
  onSave={editingAttraction ? handleAttractionUpdate : handleAttractionSave}
  defaultCountry={trip.country}
  initialData={editingAttraction ? attractionToFormData(editingAttraction) : undefined}
/>
```

**`attractionToFormData`** — pure mapping function (put in a local helper or inline):
```ts
function attractionToFormData(a: Attraction): AttractionFormData {
  return {
    name: a.name,
    country: a.country,
    city: a.city,
    coordinates: a.coordinates ?? null,
    types: (a.types ?? []) as AttractionType[],
    durationValue: a.durationValue ?? "",
    durationUnit: (a.durationUnit ?? "hours") as DurationUnit,
    price: a.price ?? null,
    openingHours: (a.openingHours ?? buildDefaultOpeningHours()) as OpeningHours,
  };
}
```
`buildDefaultOpeningHours` is the same `DEFAULT_OPENING_HOURS` constant already in `attraction.constants.ts`.

---

### Accessibility
- Edit button: `aria-label={`Edit ${attraction.name}`}` — descriptive, not icon-only
- Remove button: keep existing `aria-label`
- Modal heading change (`h2`) announced by screen readers automatically via `role="dialog"` + `aria-labelledby`

## Completion Summary
Attraction editing confirmed by user on 2026-06-29. Reused `NewAttractionModal` with a new `initialData` prop for edit mode, added Edit button per row, `PUT /api/attractions/[id]` handler with `notes`/`photoUrl`, and a new `AttractionDetailModal` for viewing all attraction details on click. The attraction row is now clickable (keyboard-accessible) and has a hover state.

## Implementation Notes
- Files modified: `src/components/NewAttractionModal/attraction.types.ts` (added `initialData?`), `src/components/NewAttractionModal/NewAttractionModal.tsx` (destructure + `isEditMode` flag, new sync `useEffect` on `isOpen`, title + button label switch), `src/app/trips/[id]/TripDetailClient.tsx` (new imports, `editingAttraction` state, `attractionToFormData` helper, `handleAttractionUpdate` handler, edit button + `.rowActions` wrapper, updated modal props), `src/app/trips/[id]/TripDetailClient.module.css` (added `.rowActions`, `.editBtn`)
- Deviations from brief: Added a dedicated `useEffect([isOpen])` that syncs all form state whenever the modal opens rather than just using `useState` initializers — this ensures switching between edit and create mode always starts with correct values, regardless of which was used last.
- New design tokens used: none (reorder API already exists but drag-and-drop UI is out of scope)
