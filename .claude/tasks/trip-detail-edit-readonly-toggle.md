# Task: Let user choose edit mode vs read-only mode at trips/[id]

Status: intake
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
