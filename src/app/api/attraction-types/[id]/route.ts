import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { AttractionType, formatAttractionType } from "@/models/AttractionType";
import { Attraction } from "@/models/Attraction";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";

interface RouteContext { params: Promise<{ id: string }> }

/** Admin only — updates an attraction type. */
export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const payload = getUserFromRequest(req);
    await dbConnect();

    const caller = await User.findById(payload.userId).select("role");
    if (caller?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as {
      name?: string; category?: string; icon?: string;
      categoryIcon?: string; color?: string; subtype?: string | null; order?: number;
    };

    const doc = await AttractionType.findById(id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.name !== undefined)         doc.name         = body.name.trim();
    if (body.category !== undefined)     doc.category     = body.category.trim();
    if (body.icon !== undefined)         doc.icon         = body.icon.trim();
    if (body.categoryIcon !== undefined) doc.categoryIcon = body.categoryIcon.trim();
    if (body.color !== undefined)        doc.color        = body.color.trim();
    if (body.order !== undefined)        doc.order        = body.order;
    if ("subtype" in body) {
      doc.subtype = (body.subtype as "flight" | "residence" | null) ?? undefined;
    }

    await doc.save();
    return NextResponse.json(formatAttractionType(doc));
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      return NextResponse.json({ error: "A type with that name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/** Admin only — deletes an attraction type. */
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const payload = getUserFromRequest(req);
    await dbConnect();

    const caller = await User.findById(payload.userId).select("role");
    if (caller?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await AttractionType.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Remove this type from every attraction that references it
    await Attraction.updateMany(
      { types: deleted._id },
      { $pull: { types: deleted._id } }
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
