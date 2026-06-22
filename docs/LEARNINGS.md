# Learnings

## Product

- **Dashboard is the root page (`/`)** — future tasks that add new top-level screens (Trip Detail, Explore page, Auth) should be separate routes under `src/app/`, not added to `page.tsx`.
- **Mood tags are the core UX differentiator** — every feature touching discovery or trip display should surface mood tags prominently; they are not decorative.

## Development

- **Modal portal pattern:** Use `createPortal(modal, document.body)` with a `mounted` state gate (`useEffect(() => setMounted(true), [])`) to avoid SSR/hydration mismatch. Return `null` when `!mounted || !isOpen`. The `"use client"` directive on the modal shell is sufficient — sub-components in the same module graph inherit it without needing their own directive.
- **`@react-google-maps/api` + React 19:** Install with `--legacy-peer-deps`; the package works at runtime even though its peer-dep declaration lags behind React 19.
- **Leaflet in Next.js App Router:** Use `next/dynamic(() => import('./LeafletMapWidget'), { ssr: false })` to prevent SSR errors. The Leaflet CSS import (`import "leaflet/dist/leaflet.css"`) must live inside the dynamically-imported module. Fix default marker icons by calling `L.Icon.Default.mergeOptions({ iconUrl: ... })` at module scope inside that same file.
- **`next/link` as button replacement:** When a `<button>` is purely navigational (no form submission, no side-effect), replace it with `<Link href="...">` using the same CSS class. Link renders as `<a>`, so all existing CSS applies unchanged.

- **CSS module tag color pattern:** When a component needs per-value dynamic colors (e.g. mood tag chips), define one CSS class per value in the module (`.tagHiddenGems`, `.tagInstagrammable`, etc.) and map tag strings → class names in a `.constants.ts`. This avoids inline styles entirely and keeps the hard "no inline style" rule intact.
- **Next.js Image with responsive cards:** For card components where the image must fill a responsive container, use `fill` prop + `position: relative; aspect-ratio: X/Y` on the parent wrapper — not explicit `width`/`height` props. This prevents CLS without hardcoding pixel dimensions.
- **Remote images require `remotePatterns` in `next.config.ts`** — must be configured for any external host (e.g. `images.unsplash.com`) before `<Image src="https://...">` works.
- **Client Components in App Router:** Only add `"use client"` to components that actually need `useState`/event handlers (e.g. filter section, mobile nav toggle, keyboard-interactive cards). Keep Server Components for all static/display components to reduce JS bundle.
