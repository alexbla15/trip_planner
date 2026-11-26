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
  const { name, avatarUrl } = body as { name?: string; avatarUrl?: string | null };

  await dbConnect();

  // avatarUrl: null clears the avatar (the user shows initials); a non-empty string sets it;
  // anything else leaves it unchanged.
  const set: Record<string, string> = {};
  const unset: Record<string, 1> = {};
  if (name?.trim()) set.name = name.trim();
  if (avatarUrl === null) unset.avatarUrl = 1;
  else if (typeof avatarUrl === "string" && avatarUrl.trim()) set.avatarUrl = avatarUrl.trim();

  const mutation: Record<string, unknown> = {};
  if (Object.keys(set).length) mutation.$set = set;
  if (Object.keys(unset).length) mutation.$unset = unset;

  const user = Object.keys(mutation).length
    ? await User.findByIdAndUpdate(payload.userId, mutation, { new: true, select: "-password" })
    : await User.findById(payload.userId).select("-password");

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
