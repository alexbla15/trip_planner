import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { FoodStyle, formatFoodStyle } from "@/models/FoodStyle";
import { Attraction } from "@/models/Attraction";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden, notFound, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

type Params = { params: Promise<{ id: string }> };

/** Admin only — renames a food style. Attractions reference it by id, so every
 *  attraction already using it reflects the new name automatically — no propagation needed. */
export const PUT = withApiHandler("PUT /api/food-styles/[id]", async (req: Request, { params }: Params) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const body = await req.json() as { name?: string };
  if (!body.name?.trim()) {
    throw badRequest("name is required");
  }

  let updated;
  try {
    updated = await FoodStyle.findByIdAndUpdate(id, { name: body.name.trim() }, { new: true });
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("A food style with that name already exists");
    }
    throw serverError("Server error");
  }

  if (!updated) throw notFound("Not found");
  return NextResponse.json(formatFoodStyle(updated));
});

/** Admin only — deletes a food style and removes it from every attraction referencing it. */
export const DELETE = withApiHandler("DELETE /api/food-styles/[id]", async (req: Request, { params }: Params) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const deleted = await FoodStyle.findByIdAndDelete(id);
  if (!deleted) throw notFound("Not found");

  await Attraction.updateMany(
    { foodStyles: deleted._id },
    { $pull: { foodStyles: deleted._id } }
  );

  return NextResponse.json({ success: true });
});
