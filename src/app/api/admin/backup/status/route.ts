import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { requireAdmin } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { Attraction } from "@/models/Attraction";

export const OPTIONS = corsPreflight;

/** Admin only — reports the most recent attraction create/update timestamp, so the
 *  Navbar backup button can tell the admin a new backup is needed. */
export const GET = withApiHandler("GET /api/admin/backup/status", async (req: Request) => {
  await requireAdmin(req);
  await dbConnect();

  const latest = await Attraction.findOne().sort({ updatedAt: -1 }).select("updatedAt").lean();

  return NextResponse.json({
    latestAttractionChangeAt: (latest as { updatedAt?: Date } | null)?.updatedAt ?? null,
  });
});
