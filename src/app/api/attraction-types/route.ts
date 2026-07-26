import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { AttractionType, formatAttractionType } from "@/models/AttractionType";
import "@/models/AttractionCategory"; // register model so populate("categoryId") resolves
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

/** Public — returns all attraction types sorted alphabetically by name, with category data populated. */
export const GET = withApiHandler("GET /api/attraction-types", async () => {
  await dbConnect();
  const types = await AttractionType.find().sort({ name: 1 });
  // populate is best-effort: if the cached schema (hot-reload) doesn't know categoryId yet,
  // formatAttractionType falls back to the embedded legacy fields on each document.
  try { await AttractionType.populate(types, { path: "categoryId" }); } catch { /* skip */ }
  return NextResponse.json(types.map(formatAttractionType));
});

/** Admin only — creates a new attraction type. */
export const POST = withApiHandler("POST /api/attraction-types", async (req: Request) => {
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const body = await req.json() as {
    name?: string; categoryId?: string; icon?: string; subtype?: string;
  };

  const { name, categoryId, icon, subtype } = body;
  if (!name?.trim() || !categoryId?.trim() || !icon?.trim()) {
    throw badRequest("name, categoryId, and icon are required");
  }

  let created;
  try {
    created = await AttractionType.create({
      name:       name.trim(),
      categoryId: categoryId.trim(),
      icon:       icon.trim(),
      subtype:    (subtype as "flight" | "residence" | undefined) || undefined,
    });
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("A type with that name already exists");
    }
    throw serverError("Server error");
  }
  try { await created.populate("categoryId"); } catch { /* skip if schema stale in dev */ }

  return NextResponse.json(formatAttractionType(created), { status: 201 });
});
