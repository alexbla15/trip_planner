import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { AttractionType, formatAttractionType } from "@/models/AttractionType";
import "@/models/AttractionCategory"; // register model so populate("categoryId") resolves
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";

/** Public — returns all attraction types sorted by display order, with category data populated. */
export async function GET() {
  try {
    await dbConnect();
    const types = await AttractionType.find().sort({ order: 1 });
    // populate is best-effort: if the cached schema (hot-reload) doesn't know categoryId yet,
    // formatAttractionType falls back to the embedded legacy fields on each document.
    try { await AttractionType.populate(types, { path: "categoryId" }); } catch { /* skip */ }
    return NextResponse.json(types.map(formatAttractionType));
  } catch (err) {
    console.error("[attraction-types GET]", err);
    return NextResponse.json({ error: "Failed to fetch attraction types" }, { status: 500 });
  }
}

/** Admin only — creates a new attraction type. */
export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);
    await dbConnect();

    const caller = await User.findById(payload.userId).select("role");
    if (caller?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as {
      name?: string; categoryId?: string; icon?: string; subtype?: string; order?: number;
    };

    const { name, categoryId, icon, subtype, order } = body;
    if (!name?.trim() || !categoryId?.trim() || !icon?.trim()) {
      return NextResponse.json({ error: "name, categoryId, and icon are required" }, { status: 400 });
    }

    const created = await AttractionType.create({
      name:       name.trim(),
      categoryId: categoryId.trim(),
      icon:       icon.trim(),
      subtype:    (subtype as "flight" | "residence" | undefined) || undefined,
      order:      order ?? 0,
    });
    try { await created.populate("categoryId"); } catch { /* skip if schema stale in dev */ }

    return NextResponse.json(formatAttractionType(created), { status: 201 });
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      return NextResponse.json({ error: "A type with that name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
