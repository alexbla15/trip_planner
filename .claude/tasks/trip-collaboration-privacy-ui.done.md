# Task: Trip Collaboration & Privacy — Frontend UI

Status: done

Track: A
Track reason: New UI surface — collaborator management panel and privacy toggle are not in the design system.

## Problem
Even after the backend is in place (Task 1), trip owners have no UI to invite editors, see who has access, remove collaborators, or toggle the trip's privacy. Collaborators also need a visual cue that they are editing a shared trip.

## Goal
Add a "Sharing" panel to the trip detail page that lets the owner manage collaborators and privacy, and surface a subtle shared-trip indicator for collaborators.

## Requirements

### Sharing panel (owner-only, trip detail page)
- Privacy toggle — switches `isPrivate` on/off via `PUT /api/trips/[id]` (or equivalent); label: "Private trip" with a lock icon; default off
- Collaborator list — shows avatar/initials + name + email for each collaborator with a remove (×) button that calls `DELETE /api/trips/[id]/collaborators/[userId]`
- Add-collaborator input — email text field + "Invite" button that calls `POST /api/trips/[id]/collaborators`; show inline error if email not found or already added
- The panel is only rendered when `currentUser._id === trip.ownerId`

### Shared-trip indicator (collaborator view)
- When the logged-in user is a collaborator (not owner), show a small pill/badge near the trip title: e.g. "Shared with you" with a users icon
- No editing controls for the sharing panel itself

### State wiring
- After a successful invite or remove, update the local trip state (collaborators array) without a full page reload
- After toggling privacy, update `trip.isPrivate` in local state

## Constraints
- Follow the existing CSS Modules pattern (no inline styles, no Tailwind)
- Match the design system in `docs/DESIGN_SYSTEM.md`
- The panel must be hidden from collaborators — check `trip.ownerId === currentUser._id` client-side
- Depends on Task 1 (backend) being merged first

## Out of scope
- Email notification to invited users
- Accepting/declining invitations
- Read-only collaborator role
- Any public-facing trip sharing (share link)

## Design Brief

### Overview
Two additions to `TripDetailClient`: a **`TripSharingPanel`** component (owner-only) and a **`SharedTripBadge`** inline element (collaborator view). Both use the existing design system tokens exclusively — no new colors or spacing values.

---

### 1. `TripSharingPanel` component

**File structure:**
```
src/components/TripSharingPanel/
  TripSharingPanel.tsx
  TripSharingPanel.module.css
  TripSharingPanel.types.ts
```

**Props:**
```typescript
interface TripSharingPanelProps {
  trip: Trip;                              // full trip object (has collaborators + isPrivate)
  token: string;
  onTripUpdate: (updated: Trip) => void;   // called after any successful API mutation
}
```

**Layout — card section, placed in the trip detail body below the meta row:**

```
┌─────────────────────────────────────────────────┐
│  🔒  Sharing & Privacy                          │  ← section heading (--text-lg, weight 700)
├─────────────────────────────────────────────────┤
│                                                 │
│  Private trip                        [toggle]  │  ← privacy row
│  Only you and editors can see this trip         │  ← helper text (--text-sm, --color-text-tertiary)
│                                                 │
│  ─────────────────────────────────────────────  │  ← divider (--color-border)
│                                                 │
│  Editors  (N)                                   │  ← sub-heading (--text-sm, weight 600, tertiary)
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ [AB] Alex B.    alex@email.com      [×]  │  │  ← collaborator row
│  │ [JD] Jane Doe   jane@email.com      [×]  │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────┐  [Invite]    │  ← add row
│  │  Enter email address…        │              │
│  └──────────────────────────────┘              │
│  ⚠ No user found with that email               │  ← inline error (--color-error, --text-sm)
│                                                 │
└─────────────────────────────────────────────────┘
```

**Card shell:**
- Background: `var(--color-surface)`, border: `1px solid var(--color-border)`, border-radius: `var(--radius-lg)`, padding: `24px`, shadow: `var(--shadow-sm)`

**Privacy toggle row:**
- Left: `Lock` icon (16px, `--color-text-secondary`) + "Private trip" label (`--text-sm`, weight 600, `--color-text-primary`)
- Right: CSS-only toggle switch (see below)
- Below label: helper text `--text-xs`, `--color-text-tertiary`: "Only you and editors can see this trip"
- When toggling: button disabled + `Loader2` spin replaces the toggle until API responds; on success call `onTripUpdate`

**CSS toggle switch (new pattern — no library):**
```
Width: 44px, height: 24px, border-radius: --radius-full
Track OFF: background var(--color-border), border: 1px solid var(--color-border)
Track ON:  background var(--color-primary)
Thumb: 18px circle, white, box-shadow --shadow-sm
Translate thumb: OFF → 3px, ON → 23px
Transition: background 150ms ease-out, transform 150ms ease-out
Implementation: <button role="switch" aria-checked={isPrivate}> — no hidden checkbox
```

**Collaborator list:**
- Each row: `display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--color-border-subtle)`
- Last row: no border-bottom
- **Avatar** — 36×36px circle, `--radius-full`, background `var(--color-primary-light)`, text `var(--color-primary)`, font `--text-sm` weight 700 (initials = first letter of first + last name, uppercased)
- **Name** — `--text-sm`, weight 600, `--color-text-primary`
- **Email** — `--text-xs`, `--color-text-tertiary`, truncated with ellipsis if long
- **Remove button** — icon-only `X` (14px), `--color-text-tertiary`, hover: `--color-error`; `aria-label="Remove [name]"`; 32×32px touch target; on click: optimistic remove → API call → rollback on error

**Add-collaborator row:**
- Email `<input type="email">` + `<button>` side by side (`display: flex; gap: 8px`)
- Input: flex 1, height 40px, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-md)`, padding `0 12px`, `--text-sm`, focus: `border-color: var(--color-primary)`, `outline: none`
- Error state: `border-color: var(--color-error)` on input
- "Invite" button: primary style (sky-500 bg, white text, `--radius-md`, height 40px, padding `0 16px`, `--text-sm` weight 600), `Users` icon (14px) + "Invite" label; loading: shows `Loader2` spin, disabled
- Inline error: `--text-xs`, `--color-error`, margin-top 6px; cleared on next successful invite or when input changes

**Empty state (no collaborators):**
- Centered text: "No editors yet" (`--text-sm`, `--color-text-tertiary`), above the add row

---

### 2. `SharedTripBadge` (inline element, no separate component needed)

Render this **inside** `TripDetailClient`, directly below the trip title in the hero, when `authUser._id !== trip.ownerId` and the user is in `trip.collaborators`.

```
┌──────────────────────────┐
│  👥  Shared with you     │   ← pill badge
└──────────────────────────┘
```

- **Pill**: `display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: var(--radius-full)`
- Background: `rgba(255,255,255,0.18)`, border: `1px solid rgba(255,255,255,0.35)`, `backdrop-filter: blur(4px)` — sits on top of the hero overlay so it must be legible over the dark gradient
- Text: `--text-xs`, weight 600, color `#fff`
- Icon: `Users` (Lucide, 13px, white)
- Add CSS class `heroSharedBadge` in `TripDetailClient.module.css`

---

### 3. Placement in `TripDetailClient`

1. Import `TripSharingPanel` from `@/components/TripSharingPanel/TripSharingPanel`
2. In the hero content: after `<h1 className={styles.destination}>`, conditionally render the `SharedTripBadge` pill
3. In the main content body: render `<TripSharingPanel>` as a new section **before** the attractions list, wrapped in `{authUser?._id === trip.ownerId && (...)}`
4. Pass `onTripUpdate={(updated) => setTrip(updated)}` so state stays in sync

---

### 4. State update contract

- **Invite success** (`201`): response body is the updated `Trip` — call `onTripUpdate(json)`
- **Remove success** (`200`): response body is the updated `Trip` — call `onTripUpdate(json)`
- **Privacy toggle success** (`200`): response body is the updated `Trip` — call `onTripUpdate(json)`
- All three use `PUT/POST/DELETE` with `Authorization: Bearer ${token}` header

---

### 5. Accessibility

- Toggle `<button role="switch" aria-checked={isPrivate} aria-label="Private trip">`
- Remove buttons: `aria-label="Remove [collaborator name]"`
- Invite button: standard `<button type="button">`
- Input: `<label>` visually hidden (sr-only pattern) + `<input id="collaboratorEmail" aria-describedby="inviteError">`
- Error: `<p id="inviteError" role="alert">`
- Focus rings: `outline: 2px solid var(--color-primary); outline-offset: 2px` on all interactive elements

---

### 6. Responsive

- Mobile (<640px): add-row stacks vertically (input full width, Invite button full width below)
- Desktop: add-row stays horizontal

## Implementation Notes
- Files created/modified:
  - `src/components/TripSharingPanel/TripSharingPanel.tsx` — new component
  - `src/components/TripSharingPanel/TripSharingPanel.module.css` — new styles
  - `src/components/TripSharingPanel/TripSharingPanel.types.ts` — props interface
  - `src/components/TripSharingPanel/TripSharingPanel.utils.ts` — `getInitials` pure util
  - `src/components/index.ts` — barrel export added
  - `src/app/trips/[id]/TripDetailClient.tsx` — imported `TripSharingPanel`, `Users` icon; added `isCollaborator` derived value; added `heroSharedBadge` badge and sharing panel with `sharingSection` wrapper
  - `src/app/trips/[id]/TripDetailClient.module.css` — added `.heroSharedBadge` and `.sharingSection` classes
- Deviations from brief: none
- New design tokens used: none (all values from existing design system)

## Completion Summary
Built the Trip Collaboration & Privacy UI: `TripSharingPanel` component (privacy toggle, collaborator list with initials avatars and remove buttons, searchable user combo-box), `SharedTripBadge` hero pill for collaborators, and full integration into `TripDetailClient`. Privacy toggle was fixed to use `findOneAndUpdate + $set` on the backend (Mongoose `save()` skipped writes on documents with Map fields). Collaborator schema was simplified to store only `userId` in the DB, with name/email joined via Mongoose populate at read time. Combo-box searches registered users by name or email via `GET /api/users/search`. Confirmed working by user on 2026-07-03.
