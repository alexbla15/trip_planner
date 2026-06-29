# Learnings

## Product

- **Dashboard is the root page (`/`)** — future tasks that add new top-level screens (Trip Detail, Explore page, Auth) should be separate routes under `src/app/`, not added to `page.tsx`.
- **Mood tags are the core UX differentiator** — every feature touching discovery or trip display should surface mood tags prominently; they are not decorative.
- **Interactive chips must have icons** — any toggleable chip (mood tags, attraction types) should pair an icon with its label. Text-only chips look unfinished and fail the design-system "Buttons must include icons" rule.
- **Shared entity stores belong in layout-level context** — attractions (and future entities like trips) are needed across multiple pages and entry points; wire them through a React context in `Providers.tsx` from day one, not as ad-hoc prop drilling.
- **Navbar + Footer go in `layout.tsx`, not per-page** — placing them per-page causes duplication and means new routes launch without them. Move to layout once and done.

## Development

- **Modal portal pattern:** Use `createPortal(modal, document.body)` with a `mounted` state gate (`useEffect(() => setMounted(true), [])`) to avoid SSR/hydration mismatch. Return `null` when `!mounted || !isOpen`. The `"use client"` directive on the modal shell is sufficient — sub-components in the same module graph inherit it without needing their own directive.
- **`@react-google-maps/api` + React 19:** Install with `--legacy-peer-deps`; the package works at runtime even though its peer-dep declaration lags behind React 19.
- **Leaflet in Next.js App Router:** Use `next/dynamic(() => import('./LeafletMapWidget'), { ssr: false })` to prevent SSR errors. The Leaflet CSS import (`import "leaflet/dist/leaflet.css"`) must live inside the dynamically-imported module. Fix default marker icons by calling `L.Icon.Default.mergeOptions({ iconUrl: ... })` at module scope inside that same file.
- **`next/link` as button replacement:** When a `<button>` is purely navigational (no form submission, no side-effect), replace it with `<Link href="...">` using the same CSS class. Link renders as `<a>`, so all existing CSS applies unchanged.

- **CSS module tag color pattern:** When a component needs per-value dynamic colors (e.g. mood tag chips), define one CSS class per value in the module (`.tagHiddenGems`, `.tagInstagrammable`, etc.) and map tag strings → class names in a `.constants.ts`. This avoids inline styles entirely and keeps the hard "no inline style" rule intact.
- **Next.js Image with responsive cards:** For card components where the image must fill a responsive container, use `fill` prop + `position: relative; aspect-ratio: X/Y` on the parent wrapper — not explicit `width`/`height` props. This prevents CLS without hardcoding pixel dimensions.
- **Remote images require `remotePatterns` in `next.config.ts`** — must be configured for any external host (e.g. `images.unsplash.com`) before `<Image src="https://...">` works.
- **Client Components in App Router:** Only add `"use client"` to components that actually need `useState`/event handlers (e.g. filter section, mobile nav toggle, keyboard-interactive cards). Keep Server Components for all static/display components to reduce JS bundle.
- **Auth context in dashboard pages:** Server Components cannot call `useContext`, so a page that needs the logged-in user's name must either (a) be converted to a `"use client"` with a thin inner component, or (b) use a small client sub-component for the dynamic part. Pattern (a) is simplest while data still comes from static imports; switch to RSC + server fetch once real API wiring begins.
- **JWT route handlers — Node.js runtime:** `jsonwebtoken` uses Node.js `crypto`. Next.js App Router Route Handlers default to Node.js runtime, so no `export const runtime = 'edge'` needed. Do not add it or the import will break.
- **Mongoose model re-registration guard:** Always use `(mongoose.models.ModelName as Model<T>) || mongoose.model<T>('ModelName', Schema)` to prevent "Cannot overwrite model" errors during hot-reload in dev.
- **API shape migration — migrate the type, not the mapping:** When the API shape differs from a mock type (e.g. `_id` vs `id`, `moods` vs `tags`), update the shared type to match the API directly. An adapter/mapping layer adds indirection with no payoff in Next.js client components.
- **Self-fetching client components:** When a page's data depends on `useAuth().token`, the data-fetching component must be a Client Component using `useEffect`. Server Components cannot access context or tokens. Pattern: receive the `id` param as a prop from the (server) page, do the `fetch` + `useAuth` inside the Client Component.
- **Optional coverImage on TripCard:** Use a CSS gradient placeholder (`position: absolute; inset: 0; background: linear-gradient(...)`) when `coverImage` is undefined — renders cleanly without `<Image>` receiving a null src.
- **Next.js App Router nested dynamic segments:** You cannot have two different dynamic segment names at the same folder level (e.g. `api/trips/[id]` and `api/trips/[tripId]` would conflict). All nested routes under trips must use `[id]` as the trip param name to match the existing folder.
- **Mongoose model/type naming collisions:** If a file imports a TS interface and also exports a Mongoose model with the same name (e.g. `Attraction`), alias the import (`import type { Attraction as AttractionShape }`) to avoid TS2395 merge declaration errors.
