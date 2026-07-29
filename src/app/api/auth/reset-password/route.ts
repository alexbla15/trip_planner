import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongoose";
import { User } from "@/models/User";
import { hashResetToken } from "@/lib/passwordReset";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

export const POST = withApiHandler("POST /api/auth/reset-password", async (req: Request) => {
  const body = await req.json();
  const { token, newPassword } = body as { token?: string; newPassword?: string };

  if (!token?.trim()) {
    throw badRequest("Reset token is required", "INVALID_TOKEN");
  }
  if (!newPassword || newPassword.length < 8) {
    throw badRequest("Password must be at least 8 characters");
  }

  await dbConnect();

  const tokenHash = hashResetToken(token);
  const user = await User.findOne({ resetTokenHash: tokenHash }).select("+resetTokenHash +resetTokenExpiry");

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry.getTime() < Date.now()) {
    throw badRequest("This password reset link is invalid or has expired", "INVALID_TOKEN");
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetTokenHash = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  return NextResponse.json({ message: "Password updated successfully" });
});
