import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongoose";
import { User } from "@/models/User";
import { randomAvatar } from "@/lib";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

export const POST = withApiHandler("POST /api/auth/register", async (req: Request) => {
  const body = await req.json();
  const { name, email, password } = body as { name?: string; email?: string; password?: string };

  if (!name?.trim() || !email?.trim() || !password) {
    throw badRequest("Name, email, and password are required");
  }

  await dbConnect();

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw badRequest("Email already in use");
  }

  const hashed = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      avatarUrl: randomAvatar(),
    });
  } catch (err) {
    // MongoDB duplicate key — race condition between the findOne check and create
    const mongoErr = err as { code?: number };
    if (mongoErr?.code === 11000) {
      throw badRequest("Email already in use");
    }
    throw err;
  }

  return NextResponse.json(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
    },
    { status: 201 }
  );
});
