# Task: Trip Detail Hero Redesign

Status: done

Track: A
Track reason: new visual pattern for hero content — existing chip layout is explicitly rejected, needs a different treatment

## Problem
The hero section on `trips/[id]` looks cluttered. When a trip has 4–7 mood tags, the chip row below the title dominates the space and fights the full-bleed cover image. The current layout stacks: back link → edit button → `h1` destination → "Shared with you" badge → mood tag chips (wrapping flex). Too many chips at once breaks the atmospheric feel the hero image is supposed to create.

## Goal
The hero bottom content feels clean and impressive — the destination name commands the space, and mood information is conveyed without overwhelming the visual.

## Requirements
- Mood tags must still be visible in or near the hero — they are the core UX differentiator (per LEARNINGS.md)
- No more than 3 chips shown inline, even if a trip has more tags
- All elements that are currently in the hero (back link, edit button, title, shared badge, mood tags) must still be accessible — nothing removed, just reorganised or redesigned
- Must work with 0, 1, 2, 3, and 7 mood tags without breaking layout
- Must work with and without a cover image (the placeholder gradient is the fallback)
- Responsive: mobile (320px) through desktop (1280px)
- White text + text-shadows for legibility over image

## Current code locations
- JSX: `src/app/trips/[id]/TripDetailClient.tsx`, lines ~463–501 (the `.hero` block)
- CSS: `src/app/trips/[id]/TripDetailClient.module.css`, `.hero`, `.heroContent`, `.destination`, `.tags`, `.heroSharedBadge`, `.heroEditBtn`, `.backLink`
- Mood tag component: `src/components/MoodTagChip/MoodTagChip.tsx`

## Constraints
- CSS Modules only — no Tailwind, no inline styles
- Do not change `MoodTagChip` internals — it can be used differently (e.g. limit count) but its internal styles are shared
- Do not change the tab bar or anything below the hero
- The `heroEditBtn` and `backLink` must remain functional links

## Out of scope
- Changing what data the hero shows (no new API fields)
- Editing the tab bar, overview card, or any section below the hero
- Dark mode changes

## Design Brief

### Core concept: two-layer hero

**The problem** with the current layout is everything lives in one `flex-direction: column` block at the bottom of the hero: back link → edit button → title → shared badge → all mood chips. The navigation chrome (back/edit) competes with the content (title/tags), and wrapping chips eat vertical space.

**The fix**: split into two positioned layers.

```
┌─────────────────────────────────────────────────────────────┐
│  ← My Trips                              [✏ Edit trip]      │  ← heroTopBar (absolute top)
│                                                             │
│              [FULL-BLEED COVER IMAGE]                       │
│                                                             │
│  Tokyo, Japan                                               │  ← heroContent (absolute bottom)
│  👥 Shared with you  🏖 Beach Life  ✨ Hidden Gems  +3      │  ← heroMeta row (one line)
└─────────────────────────────────────────────────────────────┘
```

---

### 1. Overlay gradient — update `.heroOverlay`

Add a top-to-bottom fade so the top controls (back link, edit button) are always legible, while preserving the existing bottom-up fade:

```css
.heroOverlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to bottom, rgba(0, 0, 0, 0.42) 0%, transparent 38%),
    linear-gradient(to top, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.18) 60%, transparent 100%);
}
```

---

### 2. New `.heroTopBar` — navigation chrome

New class. Holds back link (left) + edit button (right). Uses same desktop centering pattern as `.heroContent`.

```css
.heroTopBar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 1;
}

@media (min-width: 1024px) {
  .heroTopBar {
    max-width: 1280px;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
  }
}
```

---

### 3. Modified `.heroContent` — title + meta only

Remove the 10px gap and the `margin-bottom` spacing that compensated for the old column layout. Tighten gap to 8px.

```css
.heroContent {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 1024px) {
  .heroContent {
    max-width: 1280px;
    margin: 0 auto;
    padding: 20px 24px 24px;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
  }
}
```

---

### 4. Modified `.backLink` — remove `margin-bottom`

The `margin-bottom: 4px` was a spacing hack for the old column stack. Remove it — `.heroTopBar` handles vertical alignment via flex.

```css
.backLink {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  width: fit-content;
  transition: color var(--duration-fast) var(--easing-out);
  /* no margin-bottom */
}
```

---

### 5. New `.heroMeta` — single meta row (shared badge + tags)

Sits below the `h1`. Holds the "Shared with you" badge (when visible) and the tag row. Wraps on very narrow screens.

```css
.heroMeta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
```

---

### 6. New `.heroTagRow` — replaces old `.tags`

Strictly nowrap. The overflow badge ensures it never spills to a second line.

```css
.heroTagRow {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
}
```

Remove the old `.tags` class from the CSS file.

---

### 7. New `.heroOverflowBadge` — "+N" pill

Same glass-pill visual language as `.heroSharedBadge`. Shown only when `moods.length > 3`.

```css
.heroOverflowBadge {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
}
```

---

### 8. JSX changes — `TripDetailClient.tsx`

Replace the entire `.hero > heroContent` block (currently lines ~477–501).

**Before:**
```jsx
<div className={styles.heroContent}>
  <Link href="/trips" className={styles.backLink}>
    <ChevronLeft size={16} aria-hidden="true" />
    My Trips
  </Link>
  {(isOwner || isCollaborator) && (
    <Link href={`/trips/${trip._id}/edit`} className={styles.heroEditBtn}>
      <PenLine size={13} aria-hidden="true" />
      Edit trip
    </Link>
  )}
  <h1 className={styles.destination}>{name}</h1>
  {isCollaborator && (
    <span className={styles.heroSharedBadge}>
      <Users size={13} aria-hidden="true" />
      Shared with you
    </span>
  )}
  <div className={styles.tags}>
    {moods.map((tag) => (
      <MoodTagChip key={tag} tag={tag} />
    ))}
  </div>
</div>
```

**After:**
```jsx
{/* Navigation controls — top of hero */}
<div className={styles.heroTopBar}>
  <Link href="/trips" className={styles.backLink}>
    <ChevronLeft size={16} aria-hidden="true" />
    My Trips
  </Link>
  {canEdit && (
    <Link href={`/trips/${trip._id}/edit`} className={styles.heroEditBtn}>
      <PenLine size={13} aria-hidden="true" />
      Edit trip
    </Link>
  )}
</div>

{/* Hero text — bottom of hero */}
<div className={styles.heroContent}>
  <h1 className={styles.destination}>{name}</h1>
  {(isCollaborator || moods.length > 0) && (
    <div className={styles.heroMeta}>
      {isCollaborator && (
        <span className={styles.heroSharedBadge}>
          <Users size={13} aria-hidden="true" />
          Shared with you
        </span>
      )}
      {moods.length > 0 && (
        <div className={styles.heroTagRow}>
          {moods.slice(0, 3).map((tag) => (
            <MoodTagChip key={tag} tag={tag} />
          ))}
          {moods.length > 3 && (
            <span className={styles.heroOverflowBadge}>+{moods.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )}
</div>
```

Note: `canEdit` is already defined (`const canEdit = isOwner || isCollaborator`) — use it instead of the inline `isOwner || isCollaborator` expression.

---

### 9. What does NOT change
- `.hero` height (320px mobile / 420px desktop)
- `.heroImage`, `.heroPlaceholder`
- `.destination` typography (clamp 24–36px, weight 800, text-shadow)
- `.heroSharedBadge` styles
- `.heroEditBtn` styles (just moves to top bar)
- Tab bar, TripTabBar, and everything below the hero

## Completion Summary
Hero redesigned into two positioned layers: `heroTopBar` (back link + edit button at top) and `heroContent` (title + meta row at bottom). Mood chips capped at 3 with `+N` overflow badge. Dual-gradient overlay ensures legibility at both top and bottom. Closed 2026-07-11.

## Implementation Notes
- Files created/modified:
  - `src/app/trips/[id]/TripDetailClient.tsx` — replaced single heroContent block with heroTopBar (top) + heroContent (bottom); uses `moods.slice(0, 3)` + overflow badge; uses `canEdit` instead of inline expression
  - `src/app/trips/[id]/TripDetailClient.module.css` — updated `.heroOverlay` to dual gradient; modified `.heroContent` (gap/padding); added `.heroTopBar` + media query; removed `margin-bottom` from `.backLink`; removed `.tags`; added `.heroMeta`, `.heroTagRow`, `.heroOverflowBadge`
- Deviations from brief: none
- New design tokens used: none
