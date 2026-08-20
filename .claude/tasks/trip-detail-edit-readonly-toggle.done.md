# Task: Let user choose edit mode vs read-only mode at trips/[id]

Status: done
Track: A
Track reason: new interactive control (mode toggle) and new UI state affecting the whole trip-detail page, not covered by existing design-system tokens

## Problem
`trips/[id]` (`TripDetailClient.tsx`) currently derives editability purely from role: `canEdit = isOwner || isCollaborator` (lines 589-591), and always renders edit affordances when that's true. An owner/collaborator has no way to view their own trip in a "read-only" preview mode — e.g. to see what a non-editing viewer would see, or simply to browse without risking an accidental edit (drag-drop, popups, etc.).

## Goal
A user with edit rights on a trip can explicitly switch between "Edit mode" and "Read-only mode" while viewing `trips/[id]`; in read-only mode, all editing affordances (sidebar assignment, save, popups, custom-slot controls, drag/drop) are disabled exactly as they already are for non-editors, without changing the underlying `canEdit`/role logic.

## Requirements
- Add a mode toggle (e.g. a switch/segmented control) visible only to users where `canEdit` is true (owner/collaborator) — non-editors have no toggle, since they're already always read-only.
- Introduce a local UI state (e.g. `viewMode: "edit" | "readonly"`) that gates the same edit affordances currently gated by `canEdit`, without removing the underlying role check — effective editability = `canEdit && viewMode === "edit"`.
- Default to "Edit mode" for owners/collaborators (preserve current behavior by default) — this must be additive, not a regression.
- Persist the choice at least for the current session (e.g. local state is fine; cross-session persistence not required unless trivial).
- Ensure `CalendarSection` and any other consumer currently receiving `canEdit` as a prop receives the effective edit flag instead, so all existing gates (lines 748/756/767/780/889/902 in `CalendarSection.tsx`, and `computeAlerts` gating) respect read-only mode consistently.

## Constraints
- Do not change access control for actual non-owners/non-collaborators — they remain always read-only, no toggle shown to them.
- Do not conflate this with the separate `trips/[id]/edit` route (`EditTripClient.tsx`), which edits trip metadata (name/dates/budget) — that page is unaffected by this task.

## Out of scope
- Any backend/API permission changes — this is purely a client-side view-mode toggle layered on top of existing `canEdit`.
- Persisting the mode choice server-side or per-collaborator preference.

## Design Brief

This is a Next.js web app using CSS Modules (no Tailwind, no component library) — apply the guidance below within that stack.

**Current state** (`src/app/trips/[id]/TripDetailClient.tsx`):
- `canEdit` computed at line 591: `const canEdit = isOwner || isCollaborator;`.
- Threaded to children as `canEdit={canEdit}` at 3 call sites (`CalendarSection` line 748, `FlightsList` line 756, `ResidencesList` line 767) plus inline `{canEdit && ...}` gates at line 780 (Attractions tab "Add Attraction" button) and line 903 (per-row edit/delete buttons) and the Overview tab's "Edit trip" link.
- Hero top bar (`.heroTopBar`, lines 617-623): `position: absolute`, `display:flex; justify-content:space-between`, containing a "My Trips" back link (left) and, when the trip is private, a `PrivateChip` (right). This renders once above the tab bar (`TripTabBar`), so it's visible regardless of which tab (Overview/Attractions/Flights/Residences) is active — the correct place for a page-wide mode toggle, since the toggle must affect every tab's editability, not just Overview's.

**Toggle placement & structure:**
- Add the toggle to the right side of `.heroTopBar`, grouped with `PrivateChip` in a small flex wrapper (`gap: 8px`) so both can coexist under the existing `justify-content: space-between` layout — the wrapper replaces the bare conditional `{isPrivate && <PrivateChip .../>}` as the right-hand flex item.
- Render the toggle **only when `canEdit` is true** — non-editors never see it (they're always read-only, so a toggle would be meaningless/confusing for them).
- Use the same pill-button pattern already established by `.mapToggleBtn` (`CalendarSection.tsx`/`.module.css`) and `.toggle24h` (`NewAttractionModal.module.css`) — both are `height: 26–32px`, `border-radius: var(--radius-md)` (not full-pill; `.mapToggleBtn`/`.toggle24h` use `--radius-md`/`--radius-full` respectively, prefer `--radius-full` here since it sits over a photo hero and should read as a compact chip), inline-flex icon+label, `border: 1px solid var(--color-border)` idle / `background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary)` active, `transition: all var(--duration-fast) var(--easing-out)`.
- Because the hero has a background photo (not a plain surface), give the toggle a solid `var(--color-surface)` background at rest (not transparent) so it stays legible over varying photo brightness — matching how `PrivateChip` already handles this (check `PrivateChip`'s own CSS for its solid-background-over-photo treatment and reuse the same idle background/shadow so the two chips look like a matched set sitting side by side).
- Single button that flips between two labeled states (not two separate buttons) — same interaction model as `.toggle24h`: `Pencil` icon (lucide-react) + "Edit mode" label when in edit mode, `Eye` icon + "Read-only" label when in read-only mode, clicking flips it. Use `aria-pressed={viewMode === "edit"}` and an `aria-label` that states the action ("Switch to read-only mode" / "Switch to edit mode"), following the exact accessible pattern already used by `.mapToggleBtn` (`aria-pressed={showMap}` + dynamic `aria-label`).
- Default state: `edit` (preserves current behavior for owners/collaborators until they explicitly opt into read-only).
- `:focus-visible` outline: `2px solid var(--color-primary); outline-offset: 2px` (same as every other toggle in this codebase).

**Tokens to reuse (already defined in `docs/DESIGN_SYSTEM.md`, no new ones needed):** `--color-primary` (`#0284C7`), `--color-primary-light` (`#E0F2FE`), `--color-border`, `--color-surface`, `--radius-full`, `--duration-fast` (150ms), `--easing-out`.

**Behavioral wiring reminder for implementation:** introduce `const [viewMode, setViewMode] = useState<"edit" | "readonly">("edit")` in `TripDetailClient`, compute `const effectiveCanEdit = canEdit && viewMode === "edit"`, and pass `effectiveCanEdit` everywhere `canEdit` currently flows (the 3 prop call sites + all inline gates listed above) — `canEdit` itself stays untouched as the underlying role check (it still gates whether the toggle renders at all).

## Implementation Notes
- Files created/modified:
  - `src/app/trips/[id]/TripDetailClient.tsx` — added `viewMode` state and `effectiveCanEdit`; swapped `canEdit` → `effectiveCanEdit` at the `CalendarSection`/`FlightsList`/`ResidencesList` props, the "Add Attraction" gate, and the per-row edit/remove-button gate. Added the toggle button + `heroTopBarEnd` wrapper around `PrivateChip` in the hero top bar.
  - `src/app/trips/[id]/TripDetailClient.module.css` — added `.heroTopBarEnd`, `.viewModeToggle`, `.viewModeToggleActive`.
- Deviations from brief:
  - Used `Pencil` icon per the brief's suggestion → actually used `PenLine` instead (already imported and already the established edit icon in this exact file, used for the "Edit trip" link and per-row edit buttons — introducing a second, visually near-identical pencil icon in the same header would read as inconsistent).
  - The brief guessed `var(--color-surface)` for the idle background before knowing this codebase already has an unused `.heroEditBtn` class in the same CSS module with the exact glass/blur-over-photo treatment this needed (`rgba(255,255,255,0.1)` + `backdrop-filter: blur(4px)` + white text) — reused that pattern instead (as `.viewModeToggle`) since it's a closer, already-established match for a *button* over the hero photo than `PrivateChip`'s scrim treatment (which is styled for a static badge, sized quite large at `size="xl"`).
  - Active ("Edit mode") state uses solid `var(--color-primary)` background + white text (not `--color-primary-light`, which is a pale tint meant for light-surface contexts and would barely register over a photo) — `--color-primary-dark` used for its hover, consistent with how the design system already pairs those two tokens.
  - Left the "Edit trip" link (navigates to the separate `trips/[id]/edit` metadata route) gated by `canEdit` only, not `effectiveCanEdit` — per the task's own constraint not to conflate this toggle with that route; toggling itinerary read-only mode shouldn't block an owner from renaming their trip or changing its dates via the dedicated editor.
- New design tokens used: none — reused `--color-primary`, `--color-primary-dark`, `--radius-full`, `--duration-fast`, `--easing-out`, plus the existing `.heroEditBtn` color/blur values (not a token, but pre-existing CSS in the same module).
- Verified live via a real browser against a trip owned by the test account: toggle renders only for the owner, defaults to "Edit mode", flips to "Read-only" on click; in read-only mode the "Add Attraction" button is hidden while the unrelated "Edit trip" link stays visible in both modes, exactly as intended. Screenshots confirmed both states are legible over the hero photo/placeholder.

## Completion Summary
Owners/collaborators can now switch trips/[id] between "Edit mode" and "Read-only" via a toggle in the hero, which gates the same editing affordances non-editors already can't use, without touching the underlying role check or the separate trip-metadata editor. Confirmed by the user and closed 2026-08-20.

## Revision (post-close user feedback)
User corrected the "Edit trip" decision above — it should be hidden in read-only mode too, not exempted. Changed its gate from `canEdit` to `effectiveCanEdit` in `TripDetailClient.tsx`. Verified live: visible in edit mode, hidden after switching to read-only.
