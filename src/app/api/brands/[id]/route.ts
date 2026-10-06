import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Brand, formatBrand } from "@/models/Brand";
import { AttractionType } from "@/models/AttractionType";
import { FoodStyle } from "@/models/FoodStyle";
import { ShopStyle } from "@/models/ShopStyle";
import { Attraction } from "@/models/Attraction";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden, notFound, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

type Params = { params: Promise<{ id: string }> };

interface BrandBody {
  name?: string;
  photoUrl?: string;
  websiteUrl?: string;
  types?: string[];
  foodStyles?: string[];
  shopStyles?: string[];
}

/** Admin only — edits a brand's name/photo/website/types/foodStyles/shopStyles.
 *  Attractions reference it by id, so every attraction linked to it (and currently relying
 *  on the fallback for a given field) reflects the new default automatically — no
 *  propagation needed, same as renaming a FoodStyle. */
export const PUT = withApiHandler("PUT /api/brands/[id]", async (req: Request, { params }: Params) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const body = await req.json() as BrandBody;
  if (!body.name?.trim()) {
    throw badRequest("name is required");
  }

  const typeIds = body.types?.length
    ? (await AttractionType.find({ name: { $in: body.types } }).select("_id")).map((d) => d._id)
    : [];
  const foodStyleIds = body.foodStyles?.length
    ? (await FoodStyle.find({ name: { $in: body.foodStyles } }).select("_id")).map((d) => d._id)
    : [];
  const shopStyleIds = body.shopStyles?.length
    ? (await ShopStyle.find({ name: { $in: body.shopStyles } }).select("_id")).map((d) => d._id)
    : [];

  let updated;
  try {
    updated = await Brand.findByIdAndUpdate(
      id,
      {
        name: body.name.trim(),
        photoUrl: body.photoUrl?.trim() || undefined,
        websiteUrl: body.websiteUrl?.trim() || undefined,
        types: typeIds,
        foodStyles: foodStyleIds,
        shopStyles: shopStyleIds,
      },
      { new: true }
    );
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("A brand with that name already exists");
    }
    throw serverError("Server error");
  }

  if (!updated) throw notFound("Not found");
  await updated.populate(["types", "foodStyles", "shopStyles"]);
  return NextResponse.json(formatBrand(updated));
});

/** Admin only — deletes a brand and unlinks it from every attraction referencing it (those
 *  attractions keep whatever photo/types/website they already had of their own; they just
 *  stop falling back to this brand's defaults for whichever fields they didn't override). */
export const DELETE = withApiHandler("DELETE /api/brands/[id]", async (req: Request, { params }: Params) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const deleted = await Brand.findByIdAndDelete(id);
  if (!deleted) throw notFound("Not found");

  await Attraction.updateMany(
    { brandId: deleted._id },
    { $set: { brandId: null } }
  );

  return NextResponse.json({ success: true });
});
