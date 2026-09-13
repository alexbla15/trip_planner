Status: done
Track: B

## Completion Summary
Confirmed by user 2026-09-13.

## Request
Revert the coral/teal color palette back to sky-blue/amber; keep the rest of
the redesign (shapes, motion, hero CTA, mobile breakpoint).

## Fix
`src/app/globals.css`: reverted `--color-primary`/`-dark`/`-light`,
`--color-accent`/`-dark`, `--shadow-card-hover`, `--hero-gradient` (both
`:root` and `[data-theme="dark"]`) back to their original sky-blue/amber
values. Removed the dark-mode `--color-accent`/`--color-accent-dark`
override (restoring the original pre-redesign gap, since it only existed to
support the teal accent in dark mode). Left in place: `--radius-lg`/`-xl`
bump, `--hover-lift`/`--press-scale` tokens, `--color-overlay` token, pill
CTA buttons (Navbar + Home hero), and the Home page's new mobile breakpoint.

## Implementation Notes
- `tsc --noEmit`: clean.
- Grepped for leftover coral/teal hex values in `src/` — none found (the one
  hit was an unrelated pre-existing mood-tag seed color).
- Verified live via Playwright (demo-user login): desktop light + dark
  screenshots confirm sky-blue primary / amber accent restored, while pill
  buttons, hero CTA, and rounder shapes remain from the redesign.
