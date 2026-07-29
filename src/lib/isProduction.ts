/**
 * Explicit environment flag, independent of Next's built-in `NODE_ENV` (which
 * `next build` always sets to "production" regardless of the actual deploy
 * target, e.g. staging/preview). Set `NEXT_PUBLIC_APP_ENV=development` to
 * unlock dev-only features (like the admin quick-login button); any other
 * value, or leaving it unset, fails closed and is treated as production.
 * Uses the `NEXT_PUBLIC_` prefix so the same check works in both server code
 * and client components — Next only inlines `NEXT_PUBLIC_`-prefixed vars into
 * the client bundle.
 */
export function isProduction(): boolean {
  return process.env.NEXT_PUBLIC_APP_ENV !== "development";
}
