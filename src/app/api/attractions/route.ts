import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { formatAttraction } from "@/models/Attraction";
import { searchAttractions, createAttraction } from "@/lib/services/attractions.service";

export const OPTIONS = corsPreflight;

export const GET = withApiHandler("GET /api/attractions", async (req: Request) => {
  const { searchParams } = new URL(req.url);

  // Optional auth — used to determine which private-trip attractions are visible
  let userId: string | null = null;
  try { userId = getUserFromRequest(req).userId; } catch { /* unauthenticated */ }

  const skipParam = searchParams.get("skip");
  const limitParam = searchParams.get("limit");

  const { items, total, skip, limit } = await searchAttractions(userId, {
    country: searchParams.get("country"),
    city: searchParams.get("city"),
    q: searchParams.get("q"),
    type: searchParams.get("type"),
    ownerId: searchParams.get("ownerId"),
    skip: skipParam ? Number(skipParam) : null,
    limit: limitParam ? Number(limitParam) : null,
    includeHidden: searchParams.get("includeHidden") === "true",
  });

  // Response body stays a plain array for backward compatibility with existing callers
  // (src/services/attractions.service.ts) — pagination metadata rides on headers so
  // clients can adopt "load more" incrementally without a breaking body-shape change.
  return NextResponse.json(items.map((doc) => formatAttraction(doc, null)), {
    headers: {
      "X-Total-Count": String(total),
      "X-Skip": String(skip),
      "X-Limit": String(limit),
    },
  });
});

export const POST = withApiHandler("POST /api/attractions", async (req: Request) => {
  const payload = getUserFromRequest(req);
  const body = await req.json();

  const attraction = await createAttraction(payload, body);
  return NextResponse.json(formatAttraction(attraction, null), { status: 201 });
});
