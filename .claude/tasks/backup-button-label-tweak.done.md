Status: done
Track: B

## Completion Summary
Confirmed by user 2026-09-16.

## Request
No need to write "(new changes)" within the button.

## Fix
`src/components/Navbar/Navbar.tsx`: removed the "(new changes)" text suffix
from both the desktop dropdown and mobile menu "Download Backup" buttons.
The dot indicator (`.backupDot`/`.avatarBackupDot`) and the tooltip
("Attractions have changed since the last backup") still communicate the
same information without changing the button's label text.

## Implementation Notes
- `tsc --noEmit`: clean (JSX-only change, removed a conditional branch).
