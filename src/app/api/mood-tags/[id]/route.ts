import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { MoodTag, formatMoodTag } from "@/models/MoodTag";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden, notFound, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

type Params = { params: Promise<{ id: string }> };

/** Admin only — updates a mood tag. */
export const PUT = withApiHandler("PUT /api/mood-tags/[id]", async (req: Request, { params }: Params) => {
  const { id } = await params;
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

  let updated;
  try {
    updated = await MoodTag.findByIdAndUpdate(
      id,
      {
        name: name.trim(), icon: icon.trim(),
        color: color.trim(), bgColor: bgColor.trim(),
        darkColor: darkColor.trim(), darkBgColor: darkBgColor.trim(),
      },
      { new: true }
    );
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("A mood tag with that name already exists");
    }
    throw serverError("Server error");
  }

  if (!updated) throw notFound("Not found");
  return NextResponse.json(formatMoodTag(updated));
});

/** Admin only — deletes a mood tag. */
export const DELETE = withApiHandler("DELETE /api/mood-tags/[id]", async (req: Request, { params }: Params) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const deleted = await MoodTag.findByIdAndDelete(id);
  if (!deleted) throw notFound("Not found");
  return NextResponse.json({ success: true });
});
