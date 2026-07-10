import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { AttractionCategory, formatAttractionCategory } from "@/models/AttractionCategory";
import { AttractionType } from "@/models/AttractionType";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";

interface RouteContext { params: Promise<{ id: string }> }

/** Admin only — updates an attraction category. */
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
      name?: string; icon?: string; color?: string; order?: number;
    };

    const doc = await AttractionCategory.findById(id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.name  !== undefined) doc.name  = body.name.trim();
    if (body.icon  !== undefined) doc.icon  = body.icon.trim();
    if (body.color !== undefined) doc.color = body.color.trim();
    if (body.order !== undefined) doc.order = body.order;

    await doc.save();
    return NextResponse.json(formatAttractionCategory(doc));
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      return NextResponse.json({ error: "A category with that name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** Admin only — deletes an attraction category. */
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const payload = getUserFromRequest(req);
    await dbConnect();

    const caller = await User.findById(payload.userId).select("role");
    if (caller?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const inUse = await AttractionType.exists({ categoryId: id });
    if (inUse) {
      return NextResponse.json(
        { error: "Cannot delete: attraction types are still assigned to this category" },
        { status: 409 },
      );
    }

    const deleted = await AttractionCategory.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
