import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { AttractionCategory, formatAttractionCategory } from "@/models/AttractionCategory";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";

/** Public — returns all attraction categories sorted by display order. */
export async function GET() {
  try {
    await dbConnect();
    const cats = await AttractionCategory.find().sort({ order: 1 });
    return NextResponse.json(cats.map(formatAttractionCategory));
  } catch {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

/** Admin only — creates a new attraction category. */
export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);
    await dbConnect();

    const caller = await User.findById(payload.userId).select("role");
    if (caller?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as {
      name?: string; icon?: string; color?: string; order?: number;
    };

    const { name, icon, color, order } = body;
    if (!name?.trim() || !icon?.trim() || !color?.trim()) {
      return NextResponse.json(
        { error: "name, icon, and color are required" },
        { status: 400 },
      );
    }

    const created = await AttractionCategory.create({
      name:  name.trim(),
      icon:  icon.trim(),
      color: color.trim(),
      order: order ?? 0,
    });

    return NextResponse.json(formatAttractionCategory(created), { status: 201 });
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      return NextResponse.json({ error: "A category with that name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
