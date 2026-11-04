import { errorResponse } from "./cors.ts";
import type { AuthResult } from "./auth-core.ts";

/**
 * Server-side ownership checks for service-role document routes (review F1).
 * authenticate() proves WHO the caller is; these helpers decide WHICH session/project rows that caller may touch, mirroring the SQL policies:
 *   - caller kind "service" (internal): unrestricted
 *   - a row/chunk owned by user X is visible to X only
 *   - legacy null-owner rows and the shared KB corpus (null-owner chunks, e.g. session "kb-bridge") stay visible to every allowlisted user
 *   - a session/project with no owner record yet (new, unguessable UUID) is claimable by the caller
 * Any lookup error fails CLOSED.
 */
export interface OwnershipStore {
  /** distinct owners across prd_sessions.user_id (if a row exists) and prd_document_chunks.user_id for this session id; null = legacy/shared */
  sessionOwners(sessionId: string): Promise<(string | null)[]>;
  /** prd_projects row for the id: exists + owner */
  projectOwner(projectId: string): Promise<{ exists: boolean; owner: string | null }>;
}

type Ok = Extract<AuthResult, { ok: true }>;

export async function canAccessSession(store: OwnershipStore, auth: Ok, sessionId: string): Promise<boolean> {
  if (auth.kind === "service") return true;
  if (typeof sessionId !== "string" || sessionId.length === 0 || sessionId.length > 200) return false;
  try {
    const owners = await store.sessionOwners(sessionId);
    return owners.every((o) => o === null || o === auth.userId);
  } catch {
    return false;
  }
}

export async function canAccessProject(store: OwnershipStore, auth: Ok, projectId: string): Promise<boolean> {
  if (auth.kind === "service") return true;
  if (typeof projectId !== "string" || projectId.length === 0 || projectId.length > 200) return false;
  try {
    const p = await store.projectOwner(projectId);
    return !p.exists || p.owner === null || p.owner === auth.userId;
  } catch {
    return false;
  }
}

const forbidden = () => errorResponse("Forbidden", 403);

/** Returns a 403 Response unless the caller may use every supplied session/project id; null when allowed. */
export async function guardDocumentAccess(
  store: OwnershipStore,
  auth: Ok,
  ids: { sessionId?: string | null; projectId?: string | null },
): Promise<Response | null> {
  if (ids.sessionId != null && !(await canAccessSession(store, auth, ids.sessionId))) return forbidden();
  if (ids.projectId != null && !(await canAccessProject(store, auth, ids.projectId))) return forbidden();
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// deno-lint-ignore no-explicit-any
export function supabaseOwnershipStore(client: any): OwnershipStore {
  return {
    async sessionOwners(sessionId) {
      const owners = new Set<string | null>();
      if (UUID.test(sessionId)) {
        const { data, error } = await client.from("prd_sessions").select("user_id").eq("id", sessionId);
        if (error) throw new Error("session lookup failed");
        for (const r of data ?? []) owners.add(r.user_id ?? null);
      }
      const { data: chunkOwners, error: cErr } = await client.from("prd_document_chunks").select("user_id").eq("session_id", sessionId).limit(1000);
      if (cErr) throw new Error("chunk lookup failed");
      for (const r of chunkOwners ?? []) owners.add(r.user_id ?? null);
      return [...owners];
    },
    async projectOwner(projectId) {
      if (!UUID.test(projectId)) throw new Error("invalid project id");
      const { data, error } = await client.from("prd_projects").select("user_id").eq("id", projectId).maybeSingle();
      if (error) throw new Error("project lookup failed");
      return data ? { exists: true, owner: data.user_id ?? null } : { exists: false, owner: null };
    },
  };
}
