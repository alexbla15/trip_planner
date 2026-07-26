import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { MoodTag, formatMoodTag } from "@/models/MoodTag";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

/** Public — returns all mood tags sorted alphabetically by name. */
export const GET = withApiHandler("GET /api/mood-tags", async () => {
  await dbConnect();
  const tags = await MoodTag.find().sort({ name: 1 });
  return NextResponse.json(tags.map(formatMoodTag));
});

/** Admin only — creates a new mood tag. */
export const POST = withApiHandler("POST /api/mood-tags", async (req: Request) => {
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const body = await req.json() as {
    name?: string; icon?: string;
    color?: string; bgColor?: string;
    darkColor?: string; darkBgColor?: string;
  };

  const { name, icon, color, bgColor, darkColor, darkBgColor } = body;
  if (!name?.trim() || !icon?.trim() || !color?.trim() || !bgColor?.trim() || !darkColor?.trim() || !darkBgColor?.trim()) {
    throw badRequest("name, icon, color, bgColor, darkColor, and darkBgColor are required");
  }

  let created;
  try {
    created = await MoodTag.create({
      name: name.trim(),
      icon: icon.trim(),
      color: color.trim(),
      bgColor: bgColor.trim(),
      darkColor: darkColor.trim(),
      darkBgColor: darkBgColor.trim(),
    });
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("A mood tag with that name already exists");
    }
    throw serverError("Server error");
  }

  return NextResponse.json(formatMoodTag(created), { status: 201 });
});
