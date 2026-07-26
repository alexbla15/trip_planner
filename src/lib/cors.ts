import { NextResponse } from "next/server";

/**
 * Comma-separated allow-list of extra origins allowed to call the API cross-origin
 * (e.g. a separate marketing site or a mobile app shell). The app itself is same-origin
 * (Next.js serves both frontend and API), so this is empty by default in production.
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/** Adds CORS headers to a response when the request's Origin is same-origin or allow-listed. */
export function applyCors(req: Request, res: NextResponse): NextResponse {
  const origin = req.headers.get("origin");
  if (!origin) return res;

  const host = req.headers.get("host");
  const isSameOrigin = host ? origin.endsWith(`://${host}`) : false;

  if (isSameOrigin || ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  }
  return res;
}

/** Shared OPTIONS (CORS preflight) handler — export as `export const OPTIONS = corsPreflight;` from a route file if it needs to support cross-origin callers. */
export function corsPreflight(req: Request): NextResponse {
  return applyCors(req, new NextResponse(null, { status: 204 }));
}
