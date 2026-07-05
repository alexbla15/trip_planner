import { NextResponse } from "next/server";

const TRANSITOUS_URL = "https://api.transitous.org/api/v1/plan";

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams.toString();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 18000);

    const upstream = await fetch(`${TRANSITOUS_URL}?${params}`, {
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Transit service unavailable" }, { status: 503 });
  }
}
