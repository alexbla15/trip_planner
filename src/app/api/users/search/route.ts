import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { User } from "@/models/User";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";

export const OPTIONS = corsPreflight;

export const GET = withApiHandler("GET /api/users/search", async (req: Request) => {
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
    .select("_id name email avatarUrl")
    .limit(10)
    .lean();

  return NextResponse.json(
    users.map((u) => ({
      _id: (u._id as { toString(): string }).toString(),
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl ?? null,
    }))
  );
});
