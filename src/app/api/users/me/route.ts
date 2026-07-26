import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { notFound } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

export const GET = withApiHandler("GET /api/users/me", async (req: Request) => {
  const payload = getUserFromRequest(req);
  await dbConnect();

  const user = await User.findById(payload.userId).select("-password");
  if (!user) {
    throw notFound("User not found");
  }

  return NextResponse.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role ?? "user",
    createdAt: user.createdAt,
  });
});

export const PUT = withApiHandler("PUT /api/users/me", async (req: Request) => {
  const payload = getUserFromRequest(req);
  const body = await req.json();
  const { name, avatarUrl } = body as { name?: string; avatarUrl?: string };

  await dbConnect();

  const update: Record<string, string> = {};
  if (name?.trim()) update.name = name.trim();
  if (avatarUrl?.trim()) update.avatarUrl = avatarUrl.trim();

  const user = await User.findByIdAndUpdate(payload.userId, update, {
    new: true,
    select: "-password",
  });

  if (!user) {
    throw notFound("User not found");
  }

  return NextResponse.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role ?? "user",
    createdAt: user.createdAt,
  });
});
