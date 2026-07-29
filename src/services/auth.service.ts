import { parseOrThrow } from "./http";

export interface MessageResponse {
  message?: string;
  error?: string;
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return parseOrThrow<MessageResponse>(res);
}

// Kept as a raw Response: ResetPasswordClient distinguishes an invalid/expired
// token (INVALID_TOKEN code) from other failures to pick which terminal state to show.
export function resetPassword(token: string, newPassword: string): Promise<Response> {
  return fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
}

// Kept as a raw Response: LoginClient and RegisterClient's auto-login handle a
// failed login differently (different message, different redirect target).
export function login(email: string, password: string): Promise<Response> {
  return fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

// Kept as a raw Response for the same reason as `login` above — LoginClient
// handles a failed quick-login the same way it handles a failed real login.
export function demoLogin(role: "demo" | "admin"): Promise<Response> {
  return fetch("/api/auth/demo-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
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
