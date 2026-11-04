import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateWith, type AuthDeps, type AuthResult, type AuthUser } from "./auth-core.ts";
export { githubUsernameFromIdentity, bearerToken, authenticateWith } from "./auth-core.ts";
export type { AuthDeps, AuthResult, AuthUser } from "./auth-core.ts";

let cachedDeps: AuthDeps | null = null;
export function defaultAuthDeps(): AuthDeps {
  if (cachedDeps) return cachedDeps;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  cachedDeps = {
    serviceRoleKey: key,
    async getUser(token) {
      if (!client) return null;
      const { data, error } = await client.auth.getUser(token);
      return error || !data?.user ? null : (data.user as unknown as AuthUser);
    },
    async isAllowedUsername(username) {
      if (!client) return false;
      const { data, error } = await client.from("idealist_allowed_users").select("id").ilike("github_username", username.replace(/[\\%_]/g, "\\$&")).limit(1);
      return !error && !!data && data.length > 0;
    },
  };
  return cachedDeps;
}

export function authenticate(req: Request): Promise<AuthResult> {
  return authenticateWith(req, defaultAuthDeps());
}
