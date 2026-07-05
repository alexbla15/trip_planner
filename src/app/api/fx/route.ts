import { NextResponse } from "next/server";

/** GET /api/fx?from=USD&to=EUR  →  { rate: number }
 *  `to` defaults to ILS when omitted (backward-compatible).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = (searchParams.get("from") ?? "USD").toUpperCase();
  const to   = (searchParams.get("to")   ?? "ILS").toUpperCase();

  if (from === to) {
    return NextResponse.json({ rate: 1 });
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Exchange rate service unavailable" }, { status: 502 });
    }

    const data = await res.json() as { result: string; rates?: Record<string, number> };

    if (data.result !== "success" || !data.rates?.[to]) {
      return NextResponse.json({ error: `No ${to} rate available for ${from}` }, { status: 404 });
    }

    return NextResponse.json({ rate: data.rates[to] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch exchange rate" }, { status: 500 });
  }
}
