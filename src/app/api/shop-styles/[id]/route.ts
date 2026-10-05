import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { ShopStyle, formatShopStyle } from "@/models/ShopStyle";
import { Attraction } from "@/models/Attraction";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden, notFound, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

type Params = { params: Promise<{ id: string }> };

/** Admin only — renames/re-icons a shop style. Attractions reference it by id, so every
 *  attraction already using it reflects the change automatically — no propagation needed. */
export const PUT = withApiHandler("PUT /api/shop-styles/[id]", async (req: Request, { params }: Params) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const body = await req.json() as { name?: string; icon?: string };
  if (!body.name?.trim()) {
    throw badRequest("name is required");
  }
  if (!body.icon?.trim()) {
    throw badRequest("icon is required");
  }

  let updated;
  try {
    updated = await ShopStyle.findByIdAndUpdate(
      id,
      { name: body.name.trim(), icon: body.icon.trim() },
      { new: true }
    );
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("A shop style with that name already exists");
    }
    throw serverError("Server error");
  }

  if (!updated) throw notFound("Not found");
  return NextResponse.json(formatShopStyle(updated));
});

/** Admin only — deletes a shop style and removes it from every attraction referencing it. */
export const DELETE = withApiHandler("DELETE /api/shop-styles/[id]", async (req: Request, { params }: Params) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const deleted = await ShopStyle.findByIdAndDelete(id);
  if (!deleted) throw notFound("Not found");

  await Attraction.updateMany(
    { shopStyles: deleted._id },
    { $pull: { shopStyles: deleted._id } }
  );

  return NextResponse.json({ success: true });
});
