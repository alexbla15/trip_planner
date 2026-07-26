import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongoose";
import { User } from "@/models/User";
import { signToken } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, unauthorized } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

export const POST = withApiHandler("POST /api/auth/login", async (req: Request) => {
  const body = await req.json();
  const { email, password } = body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    throw badRequest("Email and password are required");
  }

  await dbConnect();

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw unauthorized("Invalid credentials");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw unauthorized("Invalid credentials");
  }

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
  });

  return NextResponse.json({ token });
});
