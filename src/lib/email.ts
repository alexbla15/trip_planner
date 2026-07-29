import { Resend } from "resend";

// Server-only (Resend SDK + RESEND_API_KEY) — deliberately not re-exported from
// src/lib/index.ts, same treatment as mongoose.ts/auth.ts (see docs/LEARNINGS.md).
// Its one consumer (the forgot-password route) imports it directly by path.

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not defined");
    client = new Resend(apiKey);
  }
  return client;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("RESEND_FROM_EMAIL is not defined");

  await getClient().emails.send({
    from: `TripPlanner <${from}>`,
    to,
    subject: "Reset your TripPlanner password",
    html: `
      <p>We received a request to reset your TripPlanner password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
