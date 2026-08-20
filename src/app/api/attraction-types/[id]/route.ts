import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { AttractionType, formatAttractionType } from "@/models/AttractionType";
import "@/models/AttractionCategory"; // register model so populate("categoryId") resolves
import { Attraction } from "@/models/Attraction";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden, notFound, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

interface RouteContext { params: Promise<{ id: string }> }

/** Admin only — updates an attraction type. */
export const PUT = withApiHandler("PUT /api/attraction-types/[id]", async (req: Request, { params }: RouteContext) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const body = await req.json() as {
    name?: string; categoryId?: string; icon?: string; subtype?: string | null;
  };

  const doc = await AttractionType.findById(id);
  if (!doc) throw notFound("Not found");

  if (body.name       !== undefined) doc.name       = body.name.trim();
  if (body.categoryId !== undefined) doc.categoryId = new Types.ObjectId(body.categoryId);
  if (body.icon       !== undefined) doc.icon       = body.icon.trim();
  if ("subtype" in body) {
    doc.subtype = (body.subtype as "flight" | "residence" | null) ?? undefined;
  }

  try {
    await doc.save();
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("A type with that name already exists");
    }
    throw serverError("Server error");
  }
  try { await doc.populate("categoryId"); } catch { /* skip if schema stale in dev */ }
  return NextResponse.json(formatAttractionType(doc));
});

/** Admin only — deletes an attraction type. */
export const DELETE = withApiHandler("DELETE /api/attraction-types/[id]", async (req: Request, { params }: RouteContext) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const deleted = await AttractionType.findByIdAndDelete(id);
  if (!deleted) throw notFound("Not found");

  // Remove this type from every attraction that references it
  await Attraction.updateMany(
    { types: deleted._id },
    { $pull: { types: deleted._id } }
  );

  return NextResponse.json({ success: true });
});
