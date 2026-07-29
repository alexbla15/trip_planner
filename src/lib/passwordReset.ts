import { randomBytes, createHash } from "crypto";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Hashes a raw reset token for storage/lookup. SHA-256 is sufficient here (unlike a
 *  user password) because the raw token is already high-entropy random bytes, not a
 *  low-entropy user-chosen secret — no need for a slow/salted KDF like bcrypt. */
export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Generates a new raw reset token (emailed to the user, never persisted) plus its
 *  hash + expiry (persisted on the User document). */
export function generateResetToken(): { rawToken: string; tokenHash: string; expiry: Date } {
  const rawToken = randomBytes(32).toString("hex");
  return {
    rawToken,
    tokenHash: hashResetToken(rawToken),
    expiry: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  };
}
