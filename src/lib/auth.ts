import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

/** Claims embedded in the app's JWT session token. */
export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
}

/** Signs a 7-day session token for the given user. Server-only — throws if `JWT_SECRET` is not configured. */
export function signToken(payload: JwtPayload): string {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Extracts and verifies the caller's JWT from a request's `Authorization: Bearer <token>`
 * header. Throws if the header is missing/malformed or the token is invalid/expired —
 * callers (API routes) should let this throw and respond 401.
 */
export function getUserFromRequest(req: Request): JwtPayload {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }
  const token = auth.slice(7);
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
