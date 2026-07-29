import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { User } from "@/models/User";
import { generateResetToken } from "@/lib/passwordReset";
import { sendPasswordResetEmail } from "@/lib/email";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest } from "@/lib/apiError";
import { logger } from "@/lib/logger";

export const OPTIONS = corsPreflight;

// Always the same success message, whether or not the email exists — never let
// this endpoint reveal which emails are registered. Built fresh per request:
// a shared NextResponse instance's body stream is consumed after its first
// send, so reusing one singleton across requests silently empties the body
// for every call after the first.
function genericResponse() {
  return NextResponse.json({
    message: "If an account exists for that email, we've sent a link to reset your password.",
  });
}

export const POST = withApiHandler("POST /api/auth/forgot-password", async (req: Request) => {
  const body = await req.json();
  const { email } = body as { email?: string };

  if (!email?.trim()) {
    throw badRequest("Email is required");
  }

  await dbConnect();

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return genericResponse();
  }

  const { rawToken, tokenHash, expiry } = generateResetToken();
  user.resetTokenHash = tokenHash;
  user.resetTokenExpiry = expiry;
  await user.save();

  const resetUrl = `${new URL(req.url).origin}/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    // Don't leak the send failure to the client — same generic response either
    // way — but log it so a real delivery problem is still visible server-side.
    logger.error("POST /api/auth/forgot-password", {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return genericResponse();
});
