import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { MoodTag, formatMoodTag } from "@/models/MoodTag";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** Admin only — updates a mood tag. */
export async function PUT(req: Request, { params }: Params) {
  try {
    const { id } = await params;
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
      order?: number;
    };

    const { name, icon, color, bgColor, darkColor, darkBgColor, order } = body;
    if (!name?.trim() || !icon?.trim() || !color?.trim() || !bgColor?.trim() || !darkColor?.trim() || !darkBgColor?.trim()) {
      return NextResponse.json(
        { error: "name, icon, color, bgColor, darkColor, and darkBgColor are required" },
        { status: 400 }
      );
    }

    const updated = await MoodTag.findByIdAndUpdate(
      id,
      {
        name: name.trim(), icon: icon.trim(),
        color: color.trim(), bgColor: bgColor.trim(),
        darkColor: darkColor.trim(), darkBgColor: darkBgColor.trim(),
        order: order ?? 0,
      },
      { new: true }
    );

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(formatMoodTag(updated));
  } catch (err) {
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      return NextResponse.json({ error: "A mood tag with that name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/** Admin only — deletes a mood tag. */
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = getUserFromRequest(req);
    await dbConnect();

    const caller = await User.findById(payload.userId).select("role");
    if (caller?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await MoodTag.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
