import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { embedCode } from "../_shared/voyage-code.ts";
import { logVoyageUsage } from "../_shared/usage.ts";

const MANAGEMENT_API = "https://api.supabase.com/v1";
const EMBED_BATCH_SIZE = 50;
const MAX_CHUNKS = 200;

interface SchemaColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface RlsPolicy {
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string;
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

interface DbFunction {
  routine_name: string;
  routine_type: string;
  data_type: string;
}

async function managementFetch(path: string, token: string): Promise<Response> {
  return fetch(`${MANAGEMENT_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

async function runDatabaseQuery(projectRef: string, token: string, query: string): Promise<unknown[]> {
  const res = await fetch(`${MANAGEMENT_API}/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    console.error(`DB query failed (${res.status}):`, await res.text());
    return [];
  }

  return await res.json();
}

function formatTablesDocument(columns: SchemaColumn[]): string {
  const tables: Record<string, SchemaColumn[]> = {};
  for (const col of columns) {
    if (!tables[col.table_name]) tables[col.table_name] = [];
    tables[col.table_name].push(col);
  }

  return Object.entries(tables)
    .map(([table, cols]) => {
      const colDefs = cols
        .map((c) => `  ${c.column_name} ${c.data_type}${c.is_nullable === "NO" ? " NOT NULL" : ""}${c.column_default ? ` DEFAULT ${c.column_default}` : ""}`)
        .join("\n");
      return `-- Table: ${table}\nCREATE TABLE ${table} (\n${colDefs}\n);`;
    })
    .join("\n\n");
}

function formatRlsDocument(policies: RlsPolicy[]): string {
  if (policies.length === 0) return "-- No RLS policies defined";

  return policies
    .map((p) => {
      let def = `-- Policy: ${p.policyname} on ${p.tablename} (${p.cmd}, ${p.permissive})`;
      if (p.qual) def += `\n-- USING: ${p.qual}`;
      if (p.with_check) def += `\n-- WITH CHECK: ${p.with_check}`;
      return def;
    })
    .join("\n\n");
}

function formatFunctionsDocument(funcs: DbFunction[]): string {
  if (funcs.length === 0) return "-- No database functions defined";

  return funcs
    .map((f) => `-- Function: ${f.routine_name} (${f.routine_type}) returns ${f.data_type}`)
    .join("\n");
}

function chunkText(text: string, chunkSize = 2000): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    if (current.length + line.length + 1 > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += line + "\n";
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.slice(0, MAX_CHUNKS);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase config");
    }

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Missing Authorization header", 401);

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) return errorResponse("Invalid auth token", 401);

    // Get management token from profile
    const { data: profile } = await serviceClient
      .from("idealist_profiles")
      .select("supabase_management_token")
      .eq("id", user.id)
      .single();

    if (!profile?.supabase_management_token) {
      return errorResponse("No Supabase Management token configured. Add one in Settings.", 400);
    }

    const mgmtToken = profile.supabase_management_token;
    const { supabaseProjectRef, repoName } = await req.json();

    if (!supabaseProjectRef) {
      return errorResponse("Missing supabaseProjectRef", 400);
    }

    console.log(`Fetching schema for Supabase project: ${supabaseProjectRef}`);

    // 1. Fetch project metadata
    const projectRes = await managementFetch(`/projects/${supabaseProjectRef}`, mgmtToken);
    let projectName = supabaseProjectRef;
    if (projectRes.ok) {
      const project = await projectRes.json();
      projectName = project.name || supabaseProjectRef;
    }

    // 2. Fetch table schema via SQL
    const columns = await runDatabaseQuery(supabaseProjectRef, mgmtToken,
      `SELECT table_name, column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`
    ) as SchemaColumn[];

    // 3. Fetch RLS policies
    const policies = await runDatabaseQuery(supabaseProjectRef, mgmtToken,
      `SELECT tablename, policyname, permissive, roles::text, cmd, qual, with_check
       FROM pg_policies WHERE schemaname = 'public'`
    ) as RlsPolicy[];

    // 4. Fetch database functions
    const dbFunctions = await runDatabaseQuery(supabaseProjectRef, mgmtToken,
      `SELECT routine_name, routine_type, data_type
       FROM information_schema.routines WHERE routine_schema = 'public'`
    ) as DbFunction[];

    // 5. Fetch edge functions
    let edgeFunctions: string[] = [];
    const edgeFuncsRes = await managementFetch(`/projects/${supabaseProjectRef}/functions`, mgmtToken);
    if (edgeFuncsRes.ok) {
      const funcs = await edgeFuncsRes.json();
      edgeFunctions = (funcs || []).map((f: Record<string, unknown>) =>
        `-- Edge Function: ${f.name} (${f.status}) — ${f.entrypoint_path || "index.ts"}`
      );
    }

    // 6. Fetch storage buckets
    let storageBuckets: string[] = [];
    const bucketsRes = await managementFetch(`/projects/${supabaseProjectRef}/storage/buckets`, mgmtToken);
    if (bucketsRes.ok) {
      const buckets = await bucketsRes.json();
      storageBuckets = (buckets || []).map((b: Record<string, unknown>) =>
        `-- Storage Bucket: ${b.name} (public: ${b.public})`
      );
    }

    // 7. Format documents
    const documents: { name: string; content: string }[] = [];

    const tablesDoc = formatTablesDocument(columns);
    if (tablesDoc) documents.push({ name: `${projectName}_tables.sql`, content: tablesDoc });

    const rlsDoc = formatRlsDocument(policies);
    if (rlsDoc) documents.push({ name: `${projectName}_rls_policies.sql`, content: rlsDoc });

    const dbFuncsDoc = formatFunctionsDocument(dbFunctions);
    if (dbFuncsDoc) documents.push({ name: `${projectName}_functions.sql`, content: dbFuncsDoc });

    if (edgeFunctions.length > 0) {
      documents.push({ name: `${projectName}_edge_functions.txt`, content: edgeFunctions.join("\n") });
    }

    if (storageBuckets.length > 0) {
      documents.push({ name: `${projectName}_storage.txt`, content: storageBuckets.join("\n") });
    }

    // 8. Chunk all documents
    const allChunks: { fileName: string; chunkIndex: number; text: string }[] = [];
    for (const doc of documents) {
      const chunks = chunkText(doc.content);
      for (let i = 0; i < chunks.length; i++) {
        allChunks.push({ fileName: doc.name, chunkIndex: i, text: chunks[i] });
      }
    }

    console.log(`Generated ${allChunks.length} chunks from ${documents.length} documents`);

    if (allChunks.length === 0) {
      return jsonResponse({
        success: true,
        projectName,
        tablesCount: 0,
        rlsPoliciesCount: 0,
        functionsCount: 0,
        edgeFunctionsCount: 0,
        chunksCreated: 0,
      });
    }

    // 9. Embed chunks
    const texts = allChunks.map((c) =>
      `// Supabase Schema: ${c.fileName}\n${c.text}`
    );

    const embeddings = await embedCode(texts);

    // 10. Store in prd_document_chunks
    let totalStored = 0;
    for (let i = 0; i < allChunks.length; i += EMBED_BATCH_SIZE) {
      const batch = allChunks.slice(i, i + EMBED_BATCH_SIZE);
      const rows = batch.map((chunk, idx) => ({
        user_id: user.id,
        file_name: chunk.fileName,
        file_type: "sql",
        chunk_index: chunk.chunkIndex,
        chunk_text: texts[i + idx].substring(0, 10000),
        keywords: ["supabase", "schema", chunk.fileName.includes("rls") ? "rls" : "table"],
        embedding: embeddings[i + idx] ? `[${embeddings[i + idx]!.join(",")}]` : null,
        source_type: "supabase_schema",
        repo_name: repoName || null,
      }));

      const { error: insertError } = await serviceClient
        .from("prd_document_chunks")
        .insert(rows);

      if (insertError) {
        console.error(`Failed to store schema chunks batch: ${insertError.message}`);
      } else {
        totalStored += rows.length;
      }
    }

    // 11. Update the project link record
    if (repoName) {
      await serviceClient
        .from("idealist_supabase_projects")
        .update({
          last_synced_at: new Date().toISOString(),
          schema_chunks_count: totalStored,
          supabase_project_name: projectName,
        })
        .eq("user_id", user.id)
        .eq("repo_name", repoName);
    }

    logVoyageUsage("fetch-supabase-schema/embed", "voyage-code-3", undefined, undefined);

    const tableNames = [...new Set(columns.map((c) => c.table_name))];

    console.log(`Schema indexing complete: ${totalStored} chunks for ${supabaseProjectRef}`);

    return jsonResponse({
      success: true,
      projectName,
      tablesCount: tableNames.length,
      rlsPoliciesCount: policies.length,
      functionsCount: dbFunctions.length,
      edgeFunctionsCount: edgeFunctions.length,
      storageBucketsCount: storageBuckets.length,
      chunksCreated: totalStored,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("fetch-supabase-schema error:", msg);
    return errorResponse(msg);
  }
});
