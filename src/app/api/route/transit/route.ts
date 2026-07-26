import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { ApiError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

const TRANSITOUS_URL = "https://api.transitous.org/api/v1/plan";

export const GET = withApiHandler("GET /api/route/transit", async (req: Request) => {
  const params = new URL(req.url).searchParams.toString();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 18000);

  let upstream: Response;
  try {
    upstream = await fetch(`${TRANSITOUS_URL}?${params}`, {
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError(503, "Transit service unavailable", "SERVICE_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    throw new ApiError(upstream.status, "Transit service returned an error", "UPSTREAM_ERROR");
  }

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
});
