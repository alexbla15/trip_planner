import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Brand, formatBrand } from "@/models/Brand";
import { AttractionType } from "@/models/AttractionType";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

/** Public — returns all brands sorted alphabetically by name, same visibility as
 *  food-styles/shop-styles (every visitor can see the list; only an admin can edit it). */
export const GET = withApiHandler("GET /api/brands", async () => {
  await dbConnect();
  const brands = await Brand.find().populate("types", "name").sort({ name: 1 });
  return NextResponse.json(brands.map(formatBrand));
});

/** Admin only — creates a new brand. `types` (names) is resolved to ids the same way
 *  createAttraction resolves its own `types` field. */
export const POST = withApiHandler("POST /api/brands", async (req: Request) => {
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const body = await req.json() as { name?: string; photoUrl?: string; websiteUrl?: string; types?: string[] };
  if (!body.name?.trim()) {
    throw badRequest("name is required");
  }

  const typeIds = body.types?.length
    ? (await AttractionType.find({ name: { $in: body.types } }).select("_id")).map((d) => d._id)
    : [];

  let created;
  try {
    created = await Brand.create({
      name: body.name.trim(),
      photoUrl: body.photoUrl?.trim() || undefined,
      websiteUrl: body.websiteUrl?.trim() || undefined,
      types: typeIds,
    });
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("A brand with that name already exists");
    }
    throw serverError("Server error");
  }

  await created.populate("types", "name");
  return NextResponse.json(formatBrand(created), { status: 201 });
});
