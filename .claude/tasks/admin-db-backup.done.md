Status: done
Track: A (new feature)

## Completion Summary
Confirmed by user 2026-09-16.

## Request
Admin-only button in the top navbar that creates a backup of the whole DB
and downloads it to the computer.

## Plan
See approved plan: requireAdmin helper in src/lib/auth.ts, new
GET /api/admin/backup route dumping all Mongoose models to one JSON file
with Content-Disposition, Navbar button (desktop dropdown + mobile menu)
that fetches with the auth token and triggers a blob download.

## Implementation Notes
- `src/lib/auth.ts`: added `requireAdmin(req)` — verifies JWT via
  `getUserFromRequest`, then re-checks role against the DB (JWT payload
  doesn't carry role), throws `forbidden()` if not admin.
- `src/app/api/admin/backup/route.ts` (new): admin-only GET route, dumps
  all 8 registered Mongoose models (`users`, `trips`, `attractions`,
  `attractionTypes`, `attractionCategories`, `foodStyles`, `moodTags`,
  `geoBoundaries`) via `.find({}).lean()`, returns as one JSON file with
  `Content-Disposition: attachment`. Intentionally includes the raw
  `users` collection (password hashes included) since a restorable backup
  needs it — flagged in a code comment; gated by `requireAdmin`.
- `src/components/Navbar/Navbar.tsx` + `.module.css`: new "Download Backup"
  button in both the desktop dropdown and mobile menu, under the existing
  `user.role === "admin"` gate. Fetches with the auth token, converts to a
  blob, and triggers a download via a temporary `<a>`. Loading state
  disables the button during the fetch; errors surface via the existing
  toast system.
- Deviation from plan: `MODELS` had to be typed as `Record<string,
  Model<unknown>>` (not `as const`) — TS couldn't call `.find()` on a union
  of differently-typed Mongoose models otherwise ("not callable" error).

## Verification
- `tsc --noEmit`: clean.
- Live via Playwright against `npm run dev`: logged in as admin (demo admin
  account), confirmed "Download Backup" appears in the dropdown, clicking it
  hits `GET /api/admin/backup` (200, correct `Content-Disposition` header
  with filename). Direct request confirmed the JSON body has all 8
  collection keys with real data (11 users, 10 trips, 2492 attractions,
  etc.), and that a user doc includes the `password` field as intended.
  Confirmed a non-admin (demo user) gets 403 from the endpoint directly,
  and does not see the "Download Backup" button in their dropdown at all.

## Follow-up (same session)
Added a "backup needed" indicator per a follow-up request: a new
`GET /api/admin/backup/status` route (admin-only) reports the most recent
attraction `updatedAt`; the Navbar compares it against a `tp_last_backup_at`
timestamp in localStorage (set after a successful download) and shows a
small red dot on the avatar and the "Download Backup" menu item (plus a
"(new changes)" label and tooltip) when attractions have changed since the
last backup. Verified: `tsc --noEmit` clean; isolated live check confirmed
the dot shows when localStorage has a stale/no timestamp and clears after a
successful download + reload (an intermediate combined-flow test flaked due
to Next dev-server Fast Refresh recompiling mid-test, not an app bug —
re-verified the specific stale-timestamp case in isolation and it passed).
