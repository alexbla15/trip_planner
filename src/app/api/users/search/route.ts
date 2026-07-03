import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { User } from "@/models/User";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);
    await dbConnect();

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) {
      return NextResponse.json([]);
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const users = await User.find({
      _id: { $ne: payload.userId },
      $or: [{ name: regex }, { email: regex }],
    })
      .select("_id name email")
      .limit(10)
      .lean();

    return NextResponse.json(
      users.map((u) => ({
        _id: (u._id as { toString(): string }).toString(),
        name: u.name,
        email: u.email,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
