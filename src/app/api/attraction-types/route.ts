import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { AttractionType, formatAttractionType } from "@/models/AttractionType";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";

/** Public — returns all attraction types sorted by category order then display order. */
export async function GET() {
  try {
    await dbConnect();
    const types = await AttractionType.find().sort({ order: 1 });
    return NextResponse.json(types.map(formatAttractionType));
  } catch {
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
      name?: string; category?: string; icon?: string;
      categoryIcon?: string; color?: string; subtype?: string; order?: number;
    };

    const { name, category, icon, categoryIcon, color, subtype, order } = body;
    if (!name?.trim() || !category?.trim() || !icon?.trim() || !categoryIcon?.trim() || !color?.trim()) {
      return NextResponse.json({ error: "name, category, icon, categoryIcon, and color are required" }, { status: 400 });
    }

    const created = await AttractionType.create({
      name: name.trim(),
      category: category.trim(),
      icon: icon.trim(),
      categoryIcon: categoryIcon.trim(),
      color: color.trim(),
      subtype: (subtype as "flight" | "residence" | undefined) || undefined,
      order: order ?? 0,
    });

    return NextResponse.json(formatAttractionType(created), { status: 201 });
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      return NextResponse.json({ error: "A type with that name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
