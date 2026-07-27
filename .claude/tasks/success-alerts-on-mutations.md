# Task: Success Feedback on Create/Update Actions

Status: intake

Track: A
Track reason: No toast/notification component exists anywhere in the codebase — this introduces a new, reusable UI pattern (shared toast system), not a tweak to an existing one.

## Problem
Create/update actions across the app give little or no feedback on success. Specifically:
- `AdminClient.tsx` does a full `window.location.reload()` after every successful create/update/delete (categories, types, mood tags) instead of showing a message — jarring and slow.
- `ProfileClient.tsx`'s profile name/avatar save (`handleSave`) has no success feedback at all — the edit form just closes silently.
- The only existing success message anywhere (`ProfileClient.tsx` password-change, `pwSuccess`) is a bespoke inline paragraph, not reusable elsewhere.

## Goal
Whenever the user successfully creates or updates data anywhere in the app, they see a brief, consistent success confirmation — without a jarring full-page reload.

## Requirements
- Build one shared, reusable toast/alert component (e.g. `src/components/Toast/`) — success (and error, for consistency) variants, auto-dismiss after ~3s, accessible (`role="status"`, `aria-live="polite"`), dismissible manually
- Wire it into a lightweight app-wide provider/context so any client component can trigger a toast (e.g. `useToast().success("Saved!")`)
- Replace `AdminClient.tsx`'s `window.location.reload()`-after-success pattern with: refetch/update local state + show a success toast (no full page reload) for category/type/mood-tag create, update, and delete
- Add a success toast to `ProfileClient.tsx`'s `handleSave` (name/avatar save) — currently silent
- Audit other create/update flows in the app (trip create/edit, attraction create/edit, calendar block create/edit) and add the same success toast where a mutation currently gives no feedback — keep existing feedback (e.g. navigation-on-success) if it already reads as sufficient confirmation, using judgment rather than adding redundant toasts everywhere
- Keep the existing password-change inline success message OR migrate it to the new toast system for consistency — developer's call, note the decision

## Constraints
- CSS Modules only, consistent with `docs/DESIGN_SYSTEM.md`
- No new npm dependency required — build the toast component from scratch (simple enough not to justify a library like `sonner`/`react-hot-toast`), unless the developer finds a strong reason otherwise
- Must not block or delay the UI action itself — toast is a non-blocking confirmation, not a modal

## Out of scope
- Error-state redesign beyond reusing the same component's error variant
- Undo actions inside the toast (e.g. "Undo delete")
