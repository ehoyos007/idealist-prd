import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { authenticateWith, githubUsernameFromIdentity, type AuthDeps, type AuthUser } from "./auth-core.ts";

const SERVICE = "svc-key-synthetic";
const ghUser = (name: string, id = "u1"): AuthUser => ({ id, identities: [{ provider: "github", identity_data: { user_name: name } }] });
function deps(over: Partial<AuthDeps> & { users?: Record<string, AuthUser>; allowed?: string[] } = {}): AuthDeps {
  return {
    serviceRoleKey: "serviceRoleKey" in over ? over.serviceRoleKey : SERVICE,
    getUser: over.getUser ?? (async (t) => over.users?.[t] ?? null),
    isAllowedUsername: over.isAllowedUsername ?? (async (u) => (over.allowed ?? []).some((a) => a.toLowerCase() === u.toLowerCase())),
  };
}
const req = (auth?: string, extra: Record<string, string> = {}) =>
  new Request("http://x/fn", { method: "POST", headers: { ...(auth ? { Authorization: auth } : {}), ...extra } });

Deno.test("no Authorization header -> 401", async () => {
  const r = await authenticateWith(req(), deps());
  assertEquals(r.ok, false); if (!r.ok) assertEquals(r.response.status, 401);
});
Deno.test("REGRESSION: fails closed when no service key/secret is configured (old validateApiKey failed open)", async () => {
  const r = await authenticateWith(req("Bearer anything"), deps({ serviceRoleKey: undefined }));
  assertEquals(r.ok, false); if (!r.ok) assertEquals(r.response.status, 503);
});
Deno.test("shared x-api-key is not authority", async () => {
  const r = await authenticateWith(req(undefined, { "x-api-key": "whatever" }), deps());
  assertEquals(r.ok, false);
});
Deno.test("anon key / forged JWT is rejected (never decoded locally)", async () => {
  const forged = "eyJhbGciOiJub25lIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0."; // unsigned {"role":"service_role"}
  for (const t of ["anon-key", forged]) {
    const r = await authenticateWith(req(`Bearer ${t}`), deps());
    assertEquals(r.ok, false); if (!r.ok) assertEquals(r.response.status, 401);
  }
});
Deno.test("service-role bearer is accepted as internal caller", async () => {
  const r = await authenticateWith(req(`Bearer ${SERVICE}`), deps());
  assertEquals(r.ok && r.kind, "service");
});
Deno.test("allowlisted GitHub user accepted (case-insensitive)", async () => {
  const r = await authenticateWith(req("Bearer tok"), deps({ users: { tok: ghUser("EnzoHoyos") }, allowed: ["enzohoyos"] }));
  assertEquals(r.ok && r.kind, "user");
});
Deno.test("authenticated but NOT allowlisted -> 403 (e.g. a website client account)", async () => {
  const r = await authenticateWith(req("Bearer tok"), deps({ users: { tok: ghUser("stranger") }, allowed: ["enzohoyos"] }));
  assertEquals(r.ok, false); if (!r.ok) assertEquals(r.response.status, 403);
});
Deno.test("REGRESSION: spoofed user_metadata.user_name without GitHub identity is denied", async () => {
  const spoof = { id: "u2", identities: [{ provider: "email", identity_data: { email: "a@example.test" } }], user_metadata: { user_name: "enzohoyos" } } as unknown as AuthUser;
  const r = await authenticateWith(req("Bearer tok"), deps({ users: { tok: spoof }, allowed: ["enzohoyos"] }));
  assertEquals(r.ok, false); if (!r.ok) assertEquals(r.response.status, 403);
});
Deno.test("auth backend errors fail closed", async () => {
  const r = await authenticateWith(req("Bearer tok"), deps({ getUser: async () => { throw new Error("down"); } }));
  assertEquals(r.ok, false); if (!r.ok) assertEquals(r.response.status, 503);
  const r2 = await authenticateWith(req("Bearer tok"), deps({ users: { tok: ghUser("a") }, isAllowedUsername: async () => { throw new Error("db"); } }));
  assertEquals(r2.ok, false); if (!r2.ok) assertEquals(r2.response.status, 503);
});
Deno.test("identity helper", () => {
  assertEquals(githubUsernameFromIdentity(ghUser("abc")), "abc");
  assertEquals(githubUsernameFromIdentity({ id: "x", identities: [] }), null);
  assertEquals(githubUsernameFromIdentity({ id: "x", identities: [{ provider: "github", identity_data: { preferred_username: "pu" } }] }), "pu");
});
