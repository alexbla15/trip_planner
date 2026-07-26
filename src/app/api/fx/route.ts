import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { ApiError, notFound, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

/** GET /api/fx?from=USD&to=EUR  →  { rate: number }
 *  `to` defaults to ILS when omitted (backward-compatible).
 */
export const GET = withApiHandler("GET /api/fx", async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const from = (searchParams.get("from") ?? "USD").toUpperCase();
  const to   = (searchParams.get("to")   ?? "ILS").toUpperCase();

  if (from === to) {
    return NextResponse.json({ rate: 1 });
  }

  let data: { result: string; rates?: Record<string, number> };
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new ApiError(502, "Exchange rate service unavailable", "BAD_GATEWAY");
    }

    data = await res.json() as { result: string; rates?: Record<string, number> };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw serverError("Failed to fetch exchange rate");
  }

  if (data.result !== "success" || !data.rates?.[to]) {
    throw notFound(`No ${to} rate available for ${from}`);
  }

  return NextResponse.json({ rate: data.rates[to] });
});
