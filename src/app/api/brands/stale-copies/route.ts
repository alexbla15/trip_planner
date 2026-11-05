import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Attraction } from "@/models/Attraction";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { forbidden } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

const STALE_FILTER = {
  brandId: { $ne: null },
  $or: [
    { types: { $not: { $size: 0 } } },
    { foodStyles: { $not: { $size: 0 } } },
    { shopStyles: { $not: { $size: 0 } } },
  ],
};

async function requireAdmin(req: Request) {
  const payload = getUserFromRequest(req);
  await dbConnect();
  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") throw forbidden("Forbidden");
}

/** Admin only — how many brand-linked attractions still hold their own types/food/shop
 *  styles. Those should be empty: a linked attraction live-falls-back to its brand's values,
 *  so any own copy is a stale duplicate that stops tracking the brand. */
export const GET = withApiHandler("GET /api/brands/stale-copies", async (req: Request) => {
  await requireAdmin(req);
  const count = await Attraction.countDocuments(STALE_FILTER);
  return NextResponse.json({ count });
});

/** Admin only — clears the stale own copies so those attractions fall back to their brand. */
export const POST = withApiHandler("POST /api/brands/stale-copies", async (req: Request) => {
  await requireAdmin(req);
  const result = await Attraction.updateMany(STALE_FILTER, {
    $set: { types: [], foodStyles: [], shopStyles: [] },
  });
  return NextResponse.json({ cleared: result.modifiedCount });
});
