import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongoose";
import { User } from "@/models/User";
import { signToken } from "@/lib/auth";
import { randomAvatar, isProduction } from "@/lib";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest, forbidden, serverError } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

const ACCOUNTS = {
  demo: {
    role: "user" as const,
    name: "Demo User",
    emailEnv: "DEMO_USER_EMAIL",
    passwordEnv: "DEMO_USER_PASSWORD",
  },
  admin: {
    role: "admin" as const,
    name: "Demo Admin",
    emailEnv: "DEMO_ADMIN_EMAIL",
    passwordEnv: "DEMO_ADMIN_PASSWORD",
  },
};

export const POST = withApiHandler("POST /api/auth/demo-login", async (req: Request) => {
  const body = await req.json();
  const { role } = body as { role?: string };

  if (role !== "demo" && role !== "admin") {
    throw badRequest("role must be \"demo\" or \"admin\"");
  }

  // Defense in depth beyond just hiding the button client-side — the admin
  // quick-login must never work in production, regardless of what the client sends.
  if (role === "admin" && isProduction()) {
    throw forbidden("Admin quick-login is not available in production");
  }

  const account = ACCOUNTS[role];
  const email = process.env[account.emailEnv];
  const password = process.env[account.passwordEnv];

  if (!email || !password) {
    throw serverError(`${account.emailEnv}/${account.passwordEnv} are not configured`);
  }

  await dbConnect();

  const normalizedEmail = email.toLowerCase().trim();
  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const hashed = await bcrypt.hash(password, 12);
    user = await User.create({
      name: account.name,
      email: normalizedEmail,
      password: hashed,
      avatarUrl: randomAvatar(),
      role: account.role,
    });
  }

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
  });

  return NextResponse.json({ token });
});
