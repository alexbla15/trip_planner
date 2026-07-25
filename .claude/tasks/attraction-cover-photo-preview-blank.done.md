# Task: Fix cover photo preview showing a blank box (new attraction, likely other cover fields too)

Status: done
Track: B
Track reason: Bug fix — broken behavior, not broken appearance

## Problem
When creating a new attraction and pasting a photo URL, the cover-photo preview stays a blank/empty box — no image and no visible error. Reported specifically for the new-attraction flow; not yet confirmed whether the same shared component also fails on the trip cover-photo fields (create/edit trip), but the underlying defect is in shared code used by all three.

Root cause (confirmed by investigation):
- `CoverImageField.tsx` (`src/components/CoverImageField/CoverImageField.tsx`) renders the preview `<Image>` with `onLoad`/`onError` handlers that imperatively flip `style.display` between `"block"` and `"none"` (lines 65-70).
- `CoverImageField.module.css` sets `.previewImg { display: none; }` by default (line 79) — the image is hidden until `onLoad` fires and sets it to `"block"`.
- This is the classic broken pattern for `<img>`/Next `<Image>` `onLoad` handlers: if the image is already cached/complete by the time React attaches the listener (very common — same URL pasted/tested repeatedly, or the browser has it cached from another tab/session), the browser does not re-fire the `load` event, so `onLoad` never runs and the image stays `display: none` forever — with no error either, since `onError` doesn't fire for a successfully-cached image. This matches the reported symptom exactly ("blank/empty box, no image and no error shown").
- This component (`CoverImageField`) is shared by `NewAttractionModal.tsx` (line ~464), `NewTripClient.tsx` (line ~359), and `EditTripClient.tsx` (line ~407) with structurally identical wiring — the defect is in the shared component itself, not attraction-specific, so it likely affects all three call sites, not just the one the user happened to notice it on.

## Goal
The cover photo preview reliably shows the image whenever the pasted URL is valid and loads successfully — including when the image is already cached by the browser — across all three usages of `CoverImageField` (new attraction, new trip, edit trip).

## Requirements
- Fix `CoverImageField.tsx` so the preview doesn't depend solely on a `load`/`error` event that may never fire for an already-complete image. Standard fix: check `imgRef.current?.complete` (and `naturalWidth > 0` to distinguish a completed-but-broken image) on mount/when `value` changes, in addition to the existing `onLoad`/`onError` handlers — or move the show/hide state into React state (`useState`) rather than imperative DOM mutation, checking `.complete` synchronously after render.
- Verify the fix works for: a URL typed fresh (not cached), a URL that's already cached by the browser (reproduce by pasting the same valid URL a second time in the same session), and an invalid/broken URL (should still show no preview, no crash).
- Manually verify all three call sites (new attraction, new trip, edit trip) after the fix, since they share this component.

## Constraints
- Keep the existing `unoptimized` prop on the `<Image>` (`CoverImageField.tsx` line 64) — required for arbitrary user-pasted URLs per `docs/LEARNINGS.md`, unrelated to this bug.
- Don't change the component's public props (`value`, `onChange`, `onBlur`, `error`, etc.) — three call sites depend on the current interface.

## Out of scope
- The separate attraction-search bug (tracked in `.claude/tasks/attraction-search-country-mismatch.md`).
- Any redesign of the preview UI/visuals — this is a functional fix only.

## Implementation Notes
- Files created/modified:
  - `src/components/CoverImageField/CoverImageField.tsx` — replaced the imperative `onLoad`/`onError` `style.display` toggling with derived React state: `loadedUrl` tracks the URL that has actually finished loading, and `imgLoaded = loadedUrl === value` (so the preview auto-hides the instant `value` changes, no separate reset step). Added a `checkAlreadyLoaded` ref callback that checks `img.complete && img.naturalWidth > 0` when the `<Image>` mounts, catching the case where the image is already cached and the native `load` event won't fire again. Added `key={value}` to the `<Image>` so this callback re-runs for every new URL, not just the first. Also had to add `"use client"` to this file — it previously had no client directive (didn't need hooks), but now uses `useState`/`useCallback` directly; without it, importing the component through the shared barrel into a Server Component (e.g. `src/app/explore/page.tsx`) broke with "You're importing a module that depends on `useState` into a React Server Component module."
  - `src/components/CoverImageField/CoverImageField.module.css` — added `.previewImgLoaded { display: block; }`, toggled via className instead of inline `style.display` mutation.
- Deviations from task requirements: Initially implemented the `.complete` check via `useEffect` (per the brief's literal suggestion) but the project's eslint config enforces `react-hooks/set-state-in-effect` (flags any `setState` call inside a `useEffect` body) — switched to a callback-ref + derived-state pattern instead, which avoids the effect entirely and is React's currently-recommended pattern for "reset/sync state when a prop changes" (see https://react.dev/learn/you-might-not-need-an-effect).
- New design tokens used: none — reused the existing `.preview`/`.previewImg` structure, only added one new CSS class for the loaded state.

**This first pass was verified clean by `tsc`/`eslint`/`next build` and reported done — but the user confirmed it did NOT fix the actual bug** (reported specifically for the "Edit Attraction" flow, where `CoverImageField`'s `value` is pre-filled with an existing photo URL on the very first render, not freshly typed). Re-investigated with a real headless-browser session (Playwright) against the live dev server and a real DB record, rather than continuing to reason from code alone:

- **Actual root cause, found via reproduction:** `next/image` defaults to `loading="lazy"`, which uses `IntersectionObserver` to defer the fetch until the element is near the viewport. An element with `display: none` (the preview's default, hidden-until-loaded state) has no layout box, so it can never be reported as intersecting — the lazy loader never triggers the image fetch at all. Confirmed directly in-browser: opening "Edit Attraction" on a real attraction with a real `photoUrl`, the `<img>` element's `.complete` stayed `false` and `.currentSrc` stayed `''` (network tab: zero requests for the image) even after several seconds — it wasn't a slow load or a caching quirk, the browser had simply never started fetching it, because it started (and stayed) `display: none`.
- **Fix:** added `loading="eager"` to the `<Image>` in `CoverImageField.tsx`, disabling the lazy-loading deadlock. Re-verified in the same live browser session: the image now fetches immediately, `.complete` becomes `true`, `naturalWidth` reflects the real image, and the `previewImgLoaded` class is applied — confirmed with both DOM inspection and a visual screenshot of the rendered preview.
- The earlier `.complete`-via-ref-callback fix (for a genuinely-cached image not re-firing `onLoad`) is real and still valid defensive code, but it was not the reported bug's cause — the lazy-loading deadlock was, and it required `loading="eager"` specifically.
- Also directly verified (browser network trace) that the separate "attraction card" surface the user mentioned — `AttractionDetailModal`'s photo display and the attraction list's thumbnail (`TripDetailClient.tsx`, `attractionThumbImg`) — were already working correctly (`complete: true`, real `naturalWidth`, visible in screenshots); no fix was needed there. The user's report likely referred to the same `CoverImageField` preview experienced during the edit flow.
- `tsc --noEmit`, `eslint`, and `next build` all clean after the final fix.

## Completion Summary
The reported "blank box" preview was caused by `next/image`'s default `loading="lazy"`, which never triggers a fetch for an image that starts `display: none` (no layout box for its `IntersectionObserver` to ever report as visible) — a deadlock, not a caching issue. Fixed with `loading="eager"` on the preview `<Image>` in `CoverImageField.tsx`, verified live in a real browser session against the actual dev database (not just code review): the first fix attempt (a real but secondary caching-related improvement) passed all static checks but did not resolve the user's actual repro, which prompted browser-level reproduction before re-closing this task. `tsc --noEmit`, `eslint`, and `next build` all clean; other photo-display surfaces (attraction detail modal, attraction list thumbnails) confirmed already working, no changes needed there. Confirmed working by the user in the app. Closed 2026-07-25.
