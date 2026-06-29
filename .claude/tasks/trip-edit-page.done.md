# Task: Trip Edit Page

Status: done

Track: A
Track reason: new page UI surface — edit form pre-populated with existing trip data, no existing edit pattern in the design system

## Problem
Travelers can create trips but have no way to update them after creation. If they make a mistake on the name, dates, budget, or mood tags — or want to add a cover photo — they're stuck. The trip detail page has no edit affordance.

## Goal
An edit page at `/trips/[id]/edit` that lets the traveler update all trip fields and save changes back to the API.

## Requirements

### Functional
- **Route**: `/trips/[id]/edit` — protected by `RouteGuard`
- **Pre-populate**: fetch `GET /api/trips/[id]` on mount and fill all form fields with the current values
- **Fields** (same as new-trip form, plus cover image):
  - Trip name (text input, required)
  - Country (select, required)
  - Start date / end date (date inputs, required, end ≥ start)
  - Budget (number) + currency selector (same CURRENCIES list as new-trip form)
  - Travel mood chips (MoodTagButton, at least one required)
  - Notes (textarea, 500 char max)
  - Cover image URL (text input, optional — paste a direct image URL; show a live preview thumbnail below the field when valid)
- **Save button**: calls `PUT /api/trips/[id]` with updated fields; on success redirects to `/trips/[id]`; shows inline error on failure; disabled + loading state during submission
- **Cancel link**: back to `/trips/[id]` without saving
- **Delete trip**: a "Delete trip" button (destructive, red) at the bottom of the form; shows a confirmation dialog (`window.confirm`) before calling `DELETE /api/trips/[id]`; on success redirects to `/trips`

### Non-functional
- Accessible: all inputs labelled, error messages use `role="alert"`, keyboard-navigable
- Responsive: same two-column approach as new-trip on desktop (≥768px), single column on mobile
- Route guard: redirect to `/login` if unauthenticated

### Entry point
- "Edit trip" button on the trip detail page (`TripDetailClient`) — place it in the hero content area near the trip name, styled as a ghost button (existing `.addBtn` ghost variant pattern)

## Constraints
- CSS Modules only, no Tailwind, no inline styles
- Cover image is a URL string — no file upload
- Reuse `MoodTagButton` and the `CURRENCIES` constant from `NewTripClient`
- Reuse the form field CSS patterns from `NewTripClient.module.css`
- `PUT /api/trips/[id]` already exists — no backend changes needed

## Out of scope
- File upload / Cloudinary integration
- Editing attractions from the edit page (attractions are managed on the detail page)
- Duplicate trip

---

## Design Brief

### File map
```
src/app/trips/[id]/edit/
  page.tsx                  ← metadata + RouteGuard + <EditTripClient tripId={id} />
  EditTripClient.tsx        ← "use client" — fetching, state, submission
  EditTripClient.module.css ← all styles
```

---

### Loading state (while fetching the trip)
Full-page centred spinner — same pattern as `TripDetailClient`:
```
min-height: 60dvh; display: flex; align-items: center; justify-content: center
```
Lucide `Loader2` 32px, `color: var(--color-primary)`, `animation: spin 1s linear infinite`.

---

### Page shell
Mirror `NewTripClient` structure exactly:

**`.page`** — `min-height: 100dvh`

**`.container`** — `max-width: 1280px; margin: 0 auto; padding: 0 24px 64px`

**Page header** (`.pageHeader`) — `padding: 40px 0 32px; display: flex; flex-direction: column; gap: 8px`
- Back link (`<Link href="/trips/[id]">`): `← Trip Details` — same `.backLink` style as new-trip form (`font-size: 14px; color: var(--color-text-secondary); hover: --color-primary`)
- `<h1>` with Lucide `PenLine` icon (22px, `var(--color-primary)`): "Edit Trip" — `font-family: var(--font-plus-jakarta-sans); font-size: 30px; font-weight: 700`
- `<p>` subtitle: "Update your trip details below." — `font-size: 16px; color: var(--color-text-secondary)`

---

### Two-column grid
```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: start;
}
@media (min-width: 768px) {
  .grid { grid-template-columns: 1fr 380px; }
}
```

---

### Left column — form card
`background: var(--color-surface); border-radius: var(--radius-xl); box-shadow: var(--shadow-md); padding: 32px; display: flex; flex-direction: column; gap: 28px`

Section heading label: "Trip Details" — `font-size: 18px; font-weight: 700; padding-bottom: 6px; border-bottom: 2px solid var(--color-primary-light); display: inline-block; margin: 0`

All form fields use the same `.field / .label / .input / .select / .inputError / .errorMsg` pattern as `NewTripClient.module.css`:

1. **Trip name** — `<input type="text">`, Lucide `PenLine` 14px label prefix, required
2. **Country** — `<select>` with COUNTRIES list, Lucide `Globe` 14px prefix, ChevronDown overlay, required
3. **Dates** — side-by-side date pair, "Start" / "End" sub-labels, duration pill on valid range
4. **Budget** — currency `<select>` left prefix + number `<input>` right
5. **Travel mood** — `MoodTagButton` chip group, at least one required
6. **Notes** — `<textarea>` rows=4, maxLength=500, char counter
7. **Cover image URL** (new field):
   - Label: Lucide `ImageIcon` 14px + "Cover image"
   - Helper: "Paste a direct image URL (e.g. from Unsplash)" — 12px, `--color-text-tertiary`
   - `<input type="url" placeholder="https://…">`
   - **Live preview** shown when value starts with `http`:
     `margin-top: 8px; width: 100%; aspect-ratio: 16/9; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--color-border); position: relative`
     Render `<Image src={value} fill className={styles.previewImg} alt="Cover preview" />` inside; `.previewImg { object-fit: cover }`. Render nothing if URL is empty or doesn't start with `http`.

**CTA row** (`border-top: 1px solid var(--color-border-subtle); padding-top: 24px; display: flex; justify-content: flex-end; gap: 12px`):
- **Cancel** — `<Link href="/trips/[id]">` ghost button: `height: 44px; padding: 0 20px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: transparent; color: var(--color-text-secondary); font-size: 14px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center`
- **Save Changes** — primary: `background: var(--color-primary); color: var(--color-text-inverse); height: 44px; padding: 0 24px; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; border: none; cursor: pointer`; `opacity: 0.5; cursor: not-allowed` when invalid or submitting; loading: Lucide `Loader2` 15px spinning + "Saving…"

**Danger zone** — `margin-top: 32px; padding-top: 24px; border-top: 1px dashed var(--color-border)`:
- Section label: "Danger Zone" — `font-size: 13px; font-weight: 600; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px`
- **Delete trip** button:
  `display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 20px; border-radius: var(--radius-md); border: 1px solid var(--color-error); background: transparent; color: var(--color-error); font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit`
  Icon: Lucide `Trash2` 15px. Text: "Delete trip"
  Hover: `background: rgba(239, 68, 68, 0.06)`
  On click: `window.confirm("Delete this trip? This cannot be undone.")` → if true, DELETE + redirect to `/trips`
  Loading: disable + Lucide `Loader2` spinning + "Deleting…"

---

### Right column — live preview card
`background: var(--color-surface); border-radius: var(--radius-xl); box-shadow: var(--shadow-md); padding: 28px; display: flex; flex-direction: column; gap: 16px`

Section heading: "Preview"

**Preview thumbnail** — `width: 100%; aspect-ratio: 16/9; border-radius: var(--radius-md); overflow: hidden; position: relative; background: var(--color-bg-subtle)`:
- If `coverImage` starts with `http`: `<Image fill object-fit: cover alt="Cover preview">`
- Else: gradient placeholder `background: linear-gradient(135deg, var(--color-primary-light), var(--color-bg-subtle))`

**Preview body** (`padding-top: 12px; display: flex; flex-direction: column; gap: 8px`):
- Trip name: `font-family: var(--font-plus-jakarta-sans); font-size: 17px; font-weight: 600; color: var(--color-text-primary)`; falls back to placeholder text `"Trip name"` in `var(--color-text-tertiary)`
- Country: `font-size: 13px; color: var(--color-text-tertiary)`
- Date range: Lucide `Calendar` 13px + formatted dates via `formatDisplayDate()`; hidden if no dates
- Moods: `<MoodTagChip>` per selected mood; hidden if none

Footer note: `font-size: 12px; color: var(--color-text-tertiary); text-align: center` — "Live preview of your trip card."

---

### Entry point — TripDetailClient hero

Add `<Link href={`/trips/${trip._id}/edit`}>` button in the hero content area, placed between the back link and the `<h1>`. New CSS class `.heroEditBtn` in `TripDetailClient.module.css`:

```css
.heroEditBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  width: fit-content;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: background var(--duration-fast) var(--easing-out),
    border-color var(--duration-fast) var(--easing-out);
}
.heroEditBtn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.8);
}
```

Icon: Lucide `PenLine` 13px. Label: "Edit trip".

---

### Accessibility
- All inputs: `<label htmlFor>` + `aria-required="true"` on required fields
- Errors: `role="alert"` on each inline error message
- Save button: `aria-disabled` when form is invalid or submitting
- Delete button: `aria-label="Delete this trip permanently"`
- Cover preview: `aria-live="polite"` on preview container; `alt="Cover preview"` on Image
- On failed save: auto-focus first invalid field

## Completion Summary
Trip edit page confirmed by the user on 2026-06-29. A full `/trips/[id]/edit` page was built with pre-populated form fields, a live preview card, cover image URL input with thumbnail preview, Save Changes (PUT) and Delete (DELETE with confirmation) flows, and an "Edit trip" ghost button wired into the trip detail hero.

## Implementation Notes
- Files created: `src/app/trips/[id]/edit/page.tsx`, `src/app/trips/[id]/edit/EditTripClient.tsx`, `src/app/trips/[id]/edit/EditTripClient.module.css`
- Files modified: `next.config.ts` (added `{ protocol: 'https', hostname: '**' }` remotePattern for arbitrary cover image URLs), `src/app/trips/[id]/TripDetailClient.tsx` (added "Edit trip" Link + PenLine import), `src/app/trips/[id]/TripDetailClient.module.css` (added `.heroEditBtn`)
- Deviations from brief: Cover image `<Image>` uses `unoptimized` prop to avoid Next.js optimisation errors for arbitrary external URLs (the `**` remotePattern handles security scoping). `getNotesCountClass` takes the CSS `styles` object as a parameter since the class names are module-scoped — this keeps the function pure and avoids importing styles into a separate utils file.
- New design tokens used: none — all values from existing token set
