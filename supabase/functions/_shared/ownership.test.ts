import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { canAccessProject, canAccessSession, guardDocumentAccess, type OwnershipStore } from "./ownership.ts";

const A = "aaaaaaaa-0000-0000-0000-00000000000a", B = "bbbbbbbb-0000-0000-0000-00000000000b";
const userA = { ok: true as const, kind: "user" as const, userId: A, username: "a" };
const service = { ok: true as const, kind: "service" as const };
// world: session S_A owned by A, S_B owned by B, S_NULL legacy, 'kb-bridge' shared (null chunks), S_NEW unknown, S_MIXED has chunks of both A and B
const sessions: Record<string, (string | null)[]> = { S_A: [A], S_B: [B], S_NULL: [null], "kb-bridge": [null], S_MIXED: [A, B], S_A_AND_LEGACY: [A, null] };
const projects: Record<string, { exists: boolean; owner: string | null }> = { P_A: { exists: true, owner: A }, P_B: { exists: true, owner: B }, P_NULL: { exists: true, owner: null } };
const store: OwnershipStore = {
  sessionOwners: async (s) => sessions[s] ?? [],
  projectOwner: async (p) => projects[p] ?? { exists: false, owner: null },
};
const failing: OwnershipStore = { sessionOwners: async () => { throw new Error("db down"); }, projectOwner: async () => { throw new Error("db down"); } };
const status = (r: Response | null) => (r === null ? "allow" : String(r.status));

Deno.test("sessions: own, legacy null-owner, shared KB corpus and brand-new ids are visible to an allowlisted user", async () => {
  for (const s of ["S_A", "S_NULL", "kb-bridge", "S_NEW", "S_A_AND_LEGACY"]) assertEquals(await canAccessSession(store, userA, s), true, s);
});
Deno.test("REGRESSION F1: another user's non-null-owned session (or a mixed one) is denied", async () => {
  for (const s of ["S_B", "S_MIXED"]) assertEquals(await canAccessSession(store, userA, s), false, s);
});
Deno.test("projects: own / legacy null-owner / not-yet-saved visible; B's project denied", async () => {
  for (const p of ["P_A", "P_NULL", "P_NEW"]) assertEquals(await canAccessProject(store, userA, p), true, p);
  assertEquals(await canAccessProject(store, userA, "P_B"), false);
});
Deno.test("link route guard validates BOTH sides (session and project)", async () => {
  assertEquals(status(await guardDocumentAccess(store, userA, { sessionId: "S_A", projectId: "P_A" })), "allow");
  assertEquals(status(await guardDocumentAccess(store, userA, { sessionId: "S_B", projectId: "P_A" })), "403");   // relink B's chunks into A's project
  assertEquals(status(await guardDocumentAccess(store, userA, { sessionId: "S_A", projectId: "P_B" })), "403");   // attach A's chunks to B's project
});
Deno.test("retrieve route guard: A cannot read B's session or B's project corpus; legacy + shared corpus still readable", async () => {
  assertEquals(status(await guardDocumentAccess(store, userA, { sessionId: "S_B" })), "403");
  assertEquals(status(await guardDocumentAccess(store, userA, { sessionId: "S_A", projectId: "P_B" })), "403");
  assertEquals(status(await guardDocumentAccess(store, userA, { sessionId: "kb-bridge" })), "allow");
  assertEquals(status(await guardDocumentAccess(store, userA, { sessionId: "S_NULL", projectId: "P_NULL" })), "allow");
});
Deno.test("internal service caller is unrestricted (server integrations preserved)", async () => {
  assertEquals(status(await guardDocumentAccess(store, service, { sessionId: "S_B", projectId: "P_B" })), "allow");
});
Deno.test("lookup errors and malformed ids fail closed for users", async () => {
  assertEquals(status(await guardDocumentAccess(failing, userA, { sessionId: "S_A" })), "403");
  assertEquals(status(await guardDocumentAccess(failing, userA, { projectId: "P_A" })), "403");
  assertEquals(await canAccessSession(store, userA, ""), false);
  assertEquals(await canAccessProject(store, userA, "x".repeat(300)), false);
});
