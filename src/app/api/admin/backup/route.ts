import { NextResponse } from "next/server";
import type { Model } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { requireAdmin } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { User } from "@/models/User";
import { Trip } from "@/models/Trip";
import { Attraction } from "@/models/Attraction";
import { AttractionType } from "@/models/AttractionType";
import { AttractionCategory } from "@/models/AttractionCategory";
import { FoodStyle } from "@/models/FoodStyle";
import { MoodTag } from "@/models/MoodTag";
import { GeoBoundary } from "@/models/GeoBoundary";

export const OPTIONS = corsPreflight;

const MODELS: Record<string, Model<unknown>> = {
  users: User,
  trips: Trip,
  attractions: Attraction,
  attractionTypes: AttractionType,
  attractionCategories: AttractionCategory,
  foodStyles: FoodStyle,
  moodTags: MoodTag,
  geoBoundaries: GeoBoundary,
};

/** Admin only — full DB backup as one downloadable JSON file. Includes the raw
 *  `users` collection (password hashes included) since a restorable backup needs
 *  it; protected by requireAdmin. Buffers the whole backup in memory — fine at
 *  this app's data volume; switch to streamed NDJSON later if that stops being true. */
export const GET = withApiHandler("GET /api/admin/backup", async (req: Request) => {
  await requireAdmin(req);
  await dbConnect();

  const backup: Record<string, unknown> = {};
  for (const [key, Model] of Object.entries(MODELS)) {
    backup[key] = await Model.find({}).lean();
  }

  const body = JSON.stringify({ generatedAt: new Date().toISOString(), data: backup }, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="tripplanner-backup-${timestamp}.json"`,
    },
  });
});
