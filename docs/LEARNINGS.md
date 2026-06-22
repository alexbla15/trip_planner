# Learnings

## Product

- **Dashboard is the root page (`/`)** — future tasks that add new top-level screens (Trip Detail, Explore page, Auth) should be separate routes under `src/app/`, not added to `page.tsx`.
- **Mood tags are the core UX differentiator** — every feature touching discovery or trip display should surface mood tags prominently; they are not decorative.

## Development

- **CSS module tag color pattern:** When a component needs per-value dynamic colors (e.g. mood tag chips), define one CSS class per value in the module (`.tagHiddenGems`, `.tagInstagrammable`, etc.) and map tag strings → class names in a `.constants.ts`. This avoids inline styles entirely and keeps the hard "no inline style" rule intact.
- **Next.js Image with responsive cards:** For card components where the image must fill a responsive container, use `fill` prop + `position: relative; aspect-ratio: X/Y` on the parent wrapper — not explicit `width`/`height` props. This prevents CLS without hardcoding pixel dimensions.
- **Remote images require `remotePatterns` in `next.config.ts`** — must be configured for any external host (e.g. `images.unsplash.com`) before `<Image src="https://...">` works.
- **Client Components in App Router:** Only add `"use client"` to components that actually need `useState`/event handlers (e.g. filter section, mobile nav toggle, keyboard-interactive cards). Keep Server Components for all static/display components to reduce JS bundle.
