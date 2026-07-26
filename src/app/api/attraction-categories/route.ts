import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { AttractionCategory, formatAttractionCategory } from "@/models/AttractionCategory";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

/** Public — returns all attraction categories sorted alphabetically by name. */
export const GET = withApiHandler("GET /api/attraction-categories", async () => {
  await dbConnect();
  const cats = await AttractionCategory.find().sort({ name: 1 });
  return NextResponse.json(cats.map(formatAttractionCategory));
});

/** Admin only — creates a new attraction category. */
export const POST = withApiHandler("POST /api/attraction-categories", async (req: Request) => {
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const body = await req.json() as {
    name?: string; icon?: string; color?: string;
  };

  const { name, icon, color } = body;
  if (!name?.trim() || !icon?.trim() || !color?.trim()) {
    throw badRequest("name, icon, and color are required");
  }

  let created;
  try {
    created = await AttractionCategory.create({
      name:  name.trim(),
      icon:  icon.trim(),
      color: color.trim(),
    });
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("A category with that name already exists");
    }
    throw serverError("Server error");
  }

  return NextResponse.json(formatAttractionCategory(created), { status: 201 });
});
