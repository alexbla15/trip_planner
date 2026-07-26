import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { AttractionCategory, formatAttractionCategory } from "@/models/AttractionCategory";
import { AttractionType } from "@/models/AttractionType";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, conflict, forbidden, notFound, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

interface RouteContext { params: Promise<{ id: string }> }

/** Admin only — updates an attraction category. */
export const PUT = withApiHandler("PUT /api/attraction-categories/[id]", async (req: Request, { params }: RouteContext) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const body = await req.json() as {
    name?: string; icon?: string; color?: string;
  };

  const doc = await AttractionCategory.findById(id);
  if (!doc) throw notFound("Not found");

  if (body.name  !== undefined) doc.name  = body.name.trim();
  if (body.icon  !== undefined) doc.icon  = body.icon.trim();
  if (body.color !== undefined) doc.color = body.color.trim();

  try {
    await doc.save();
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("A category with that name already exists");
    }
    throw serverError("Server error");
  }
  return NextResponse.json(formatAttractionCategory(doc));
});

/** Admin only — deletes an attraction category. */
export const DELETE = withApiHandler("DELETE /api/attraction-categories/[id]", async (req: Request, { params }: RouteContext) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  await dbConnect();

  const caller = await User.findById(payload.userId).select("role");
  if (caller?.role !== "admin") {
    throw forbidden("Forbidden");
  }

  const inUse = await AttractionType.exists({ categoryId: id });
  if (inUse) {
    throw conflict("Cannot delete: attraction types are still assigned to this category");
  }

  const deleted = await AttractionCategory.findByIdAndDelete(id);
  if (!deleted) throw notFound("Not found");

  return NextResponse.json({ success: true });
});
