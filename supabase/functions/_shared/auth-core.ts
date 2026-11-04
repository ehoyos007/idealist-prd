import { errorResponse } from "./cors.ts";

/**
 * Edge-function caller authentication (audit C2).
 *
 * Authority is, in order:
 *   1. the project's service-role key (internal/server callers) — constant-time compared, never decoded;
 *   2. a Supabase Auth user access token, verified by the Auth server (`auth.getUser`), whose *provider-issued*
 *      GitHub identity is on `idealist_allowed_users` (the real allowed-user model used by check-allowlist).
 *
 * NOT authority: a shared `x-api-key` (it ships in the VITE bundle) and `user_metadata` (user-editable).
 * Unsigned/forged JWTs are never decoded locally. Fails CLOSED when configuration is missing.
 */

export interface AuthUser {
  id: string;
  app_metadata?: Record<string, unknown> | null;
  identities?: { provider?: string; identity_data?: Record<string, unknown> | null }[] | null;
}

export interface AuthDeps {
  serviceRoleKey: string | undefined;
  getUser(token: string): Promise<AuthUser | null>;
  isAllowedUsername(username: string): Promise<boolean>;
}

export type AuthResult =
  | { ok: true; kind: "service" }
  | { ok: true; kind: "user"; userId: string; username: string }
  | { ok: false; response: Response };

/** GitHub username from the provider identity GoTrue stored — NOT from user-editable user_metadata. */
export function githubUsernameFromIdentity(user: AuthUser): string | null {
  const id = (user.identities ?? []).find((i) => i?.provider === "github");
  const data = id?.identity_data ?? null;
  const v = (data?.user_name ?? data?.preferred_username) as unknown;
  return typeof v === "string" && v.length > 0 ? v : null; // compared case-insensitively by callers
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function bearerToken(req: Request): string | null {
  const h = req.headers.get("Authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  return m ? m[1] : null;
}

export async function authenticateWith(req: Request, deps: AuthDeps): Promise<AuthResult> {
  const deny = (status: number, msg: string): AuthResult => ({ ok: false, response: errorResponse(msg, status) });

  const token = bearerToken(req);
  if (!token) return deny(401, "Missing Authorization header");
  if (!deps.serviceRoleKey) return deny(503, "Authentication is not configured");

  if (timingSafeEqualStr(token, deps.serviceRoleKey)) return { ok: true, kind: "service" };

  let user: AuthUser | null = null;
  try {
    user = await deps.getUser(token);
  } catch {
    return deny(503, "Authentication service unavailable");
  }
  if (!user) return deny(401, "Invalid auth token");

  const username = githubUsernameFromIdentity(user);
  if (!username) return deny(403, "Not an allowed user");

  let allowed = false;
  try {
    allowed = await deps.isAllowedUsername(username);
  } catch {
    return deny(503, "Authentication service unavailable");
  }
  if (!allowed) return deny(403, "Not an allowed user");

  return { ok: true, kind: "user", userId: user.id, username };
}
