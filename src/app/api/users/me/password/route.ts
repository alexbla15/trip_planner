import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongoose";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, notFound, unauthorized } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

export const PATCH = withApiHandler("PATCH /api/users/me/password", async (req: Request) => {
  const payload = getUserFromRequest(req);
  const { currentPassword, newPassword } = await req.json() as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    throw badRequest("currentPassword and newPassword are required");
  }

  if (newPassword.length < 8) {
    throw badRequest("New password must be at least 8 characters");
  }

  await dbConnect();

  const user = await User.findById(payload.userId);
  if (!user) throw notFound("User not found");

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    throw unauthorized("Current password is incorrect");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return NextResponse.json({ message: "Password updated" });
});
