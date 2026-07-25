import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { MoodTag, formatMoodTag } from "@/models/MoodTag";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";

/** Public — returns all mood tags sorted alphabetically by name. */
export async function GET() {
  try {
    await dbConnect();
    const tags = await MoodTag.find().sort({ name: 1 });
    return NextResponse.json(tags.map(formatMoodTag));
  } catch {
    return NextResponse.json({ error: "Failed to fetch mood tags" }, { status: 500 });
  }
}

/** Admin only — creates a new mood tag. */
export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);
    await dbConnect();

    const caller = await User.findById(payload.userId).select("role");
    if (caller?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as {
      name?: string; icon?: string;
      color?: string; bgColor?: string;
      darkColor?: string; darkBgColor?: string;
    };

    const { name, icon, color, bgColor, darkColor, darkBgColor } = body;
    if (!name?.trim() || !icon?.trim() || !color?.trim() || !bgColor?.trim() || !darkColor?.trim() || !darkBgColor?.trim()) {
      return NextResponse.json(
        { error: "name, icon, color, bgColor, darkColor, and darkBgColor are required" },
        { status: 400 }
      );
    }

    const created = await MoodTag.create({
      name: name.trim(),
      icon: icon.trim(),
      color: color.trim(),
      bgColor: bgColor.trim(),
      darkColor: darkColor.trim(),
      darkBgColor: darkBgColor.trim(),
    });

    return NextResponse.json(formatMoodTag(created), { status: 201 });
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      return NextResponse.json({ error: "A mood tag with that name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
