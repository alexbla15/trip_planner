import { parseOrThrow } from "./http";

// Kept as a raw Response: LoginClient and RegisterClient's auto-login handle a
// failed login differently (different message, different redirect target).
export function login(email: string, password: string): Promise<Response> {
  return fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export interface RegisterResponse {
  token?: string;
  error?: string;
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return parseOrThrow<RegisterResponse>(res);
}
