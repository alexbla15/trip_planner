import { NextResponse } from "next/server";
import type { Types } from "mongoose";
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

/** Sorted string ids, for comparing two ObjectId arrays regardless of order. */
function idKey(ids: Types.ObjectId[]): string {
  return [...ids].map((i) => i.toString()).sort().join(",");
}

/** Admin only — edits a brand's name/photo/website/types/foodStyles/shopStyles, then
 *  propagates each CHANGED field onto every linked attraction that still matches the OLD
 *  default — i.e. one that's relying on it (either by having been picked via the "Brand /
 *  chain" field in the attraction form, which copies the brand's values in at creation
 *  time rather than leaving the field blank, or by having never set its own and genuinely
 *  live-falling-back — those need no write at all, `formatAttraction` already resolves
 *  them from the brand doc directly). An attraction whose own value no longer matches the
 *  old default was deliberately edited away from it — that's an override, and is left
 *  untouched, exactly as requested. */
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

  const before = await Brand.findById(id);
  if (!before) throw notFound("Not found");
  const oldPhotoUrl = before.photoUrl;
  const oldWebsiteUrl = before.websiteUrl;
  const oldTypeKey = idKey(before.types as Types.ObjectId[]);
  const oldFoodStyleKey = idKey(before.foodStyles as Types.ObjectId[]);
  const oldShopStyleKey = idKey(before.shopStyles as Types.ObjectId[]);

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

  // Only touch attractions whose own field value still matches what the brand USED to say —
  // that's the "inherited a copy, never overrode it" case. Truly-empty fields need nothing
  // (they already live-fall-back); fields that differ from the old default were deliberately
  // changed and must be left alone.
  const linkedAttractions = await Attraction.find({ brandId: updated._id })
    .select("photoUrl websiteUrl types foodStyles shopStyles");
  for (const attraction of linkedAttractions) {
    const set: Record<string, unknown> = {};
    if (attraction.photoUrl && attraction.photoUrl === oldPhotoUrl) {
      set.photoUrl = updated.photoUrl;
    }
    if (attraction.websiteUrl && attraction.websiteUrl === oldWebsiteUrl) {
      set.websiteUrl = updated.websiteUrl;
    }
    if (attraction.types.length > 0 && idKey(attraction.types as Types.ObjectId[]) === oldTypeKey) {
      set.types = updated.types;
    }
    if ((attraction.foodStyles?.length ?? 0) > 0 && idKey(attraction.foodStyles as Types.ObjectId[]) === oldFoodStyleKey) {
      set.foodStyles = updated.foodStyles;
    }
    if ((attraction.shopStyles?.length ?? 0) > 0 && idKey(attraction.shopStyles as Types.ObjectId[]) === oldShopStyleKey) {
      set.shopStyles = updated.shopStyles;
    }
    if (Object.keys(set).length > 0) {
      await Attraction.updateOne({ _id: attraction._id }, { $set: set });
    }
  }

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
