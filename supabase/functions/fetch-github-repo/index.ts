import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateApiKey } from "../_shared/auth.ts";
import { embedCode } from "../_shared/voyage-code.ts";
import { chunkFile, shouldIndexFile, type CodeChunk } from "../_shared/code-chunker.ts";
import { REPO_DEPTH_CLASSIFICATION_PROMPT, REPO_SUMMARY_PROMPT } from "../_shared/prompts.ts";
import { logOpenRouterUsage, logVoyageUsage } from "../_shared/usage.ts";

const GITHUB_API = "https://api.github.com";
const FILE_BATCH_SIZE = 5;
const EMBED_BATCH_SIZE = 50;

// Priority config files to always fetch for context
const PRIORITY_FILES = [
  "README.md",
  "readme.md",
  "README",
  "package.json",
  "tsconfig.json",
  "Cargo.toml",
  "go.mod",
  "pyproject.toml",
  "requirements.txt",
  "deno.json",
  "deno.jsonc",
];

// ─── GitHub API Helpers ───

async function githubFetch(url: string): Promise<Response> {
  const token = Deno.env.get("GITHUB_TOKEN");
  return fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/vnd.github+json",
    },
  });
}

function parseRepoInput(input: string): { owner: string; repo: string } | null {
  // Accept "owner/repo" shorthand
  const shorthand = input.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shorthand) return { owner: shorthand[1], repo: shorthand[2] };

  // Accept full GitHub URL
  const url = input.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
  if (url) return { owner: url[1], repo: url[2] };

  return null;
}

async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const res = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}`);
  if (!res.ok) throw new Error(`Repository not found: ${owner}/${repo} (${res.status})`);
  const data = await res.json();
  return data.default_branch || "main";
}

async function getRepoTree(
  owner: string,
  repo: string,
  branch: string
): Promise<{ path: string; type: string; size?: number }[]> {
  const res = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );
  if (!res.ok) throw new Error(`Failed to get repo tree: ${res.status}`);
  const data = await res.json();
  return (data.tree || []).map((e: { path: string; type: string; size?: number }) => ({
    path: e.path,
    type: e.type,
    size: e.size,
  }));
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  const res = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.encoding === "base64" && data.content) {
    try {
      const cleaned = data.content.replace(/\n/g, "");
      const binary = atob(cleaned);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch {
      return null;
    }
  }
  return null;
}

// ─── FHE Cross-Project Query ───

async function checkFheIndex(
  repoFullName: string
): Promise<{ indexed: boolean; chunks?: string[] }> {
  const fheUrl = Deno.env.get("FHE_SUPABASE_URL");
  const fheKey = Deno.env.get("FHE_SUPABASE_KEY");
  if (!fheUrl || !fheKey) return { indexed: false };

  try {
    const fhe = createClient(fheUrl, fheKey);
    const { data } = await fhe
      .from("repo_index_status")
      .select("status, chunk_count")
      .eq("repo_full_name", repoFullName)
      .eq("status", "indexed")
      .single();

    if (!data) return { indexed: false };

    // Query broad codebase overview from FHE embeddings
    const { data: matchData } = await fhe.rpc("match_code_embeddings", {
      query_text: "codebase overview architecture main features entry point",
      repo_name: repoFullName,
      match_count: 20,
    });

    const chunks = (matchData || []).map(
      (r: { content: string; file_path: string }) =>
        `[${r.file_path}]\n${r.content}`
    );

    return { indexed: true, chunks };
  } catch (err) {
    console.error("FHE query failed:", err);
    return { indexed: false };
  }
}

// ─── AI Helpers ───

async function classifyDepth(
  readme: string,
  tree: string[],
  userContext: string | undefined
): Promise<"summary" | "deep"> {
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
  if (!OPENROUTER_API_KEY) return "summary";

  const treePreview = tree.slice(0, 100).join("\n");
  const prompt = [
    `README:\n${readme.substring(0, 3000)}`,
    `\nFile tree (first 100 files):\n${treePreview}`,
    userContext ? `\nUser context: ${userContext}` : "",
  ].join("\n");

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-lite-001",
          messages: [
            { role: "system", content: REPO_DEPTH_CLASSIFICATION_PROMPT },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) return "summary";

    const data = await response.json();
    logOpenRouterUsage(
      data,
      "fetch-github-repo/classify",
      "google/gemini-2.0-flash-lite-001"
    );

    const content = data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(content);
    return parsed.depth === "deep" ? "deep" : "summary";
  } catch {
    return "summary";
  }
}

async function generateSummary(
  repoName: string,
  readme: string,
  tree: string[],
  configContents: Record<string, string>
): Promise<string> {
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
  if (!OPENROUTER_API_KEY) {
    return `Repository: ${repoName}. ${tree.length} files. README available but summary generation unavailable.`;
  }

  const treePreview = tree.slice(0, 150).join("\n");
  const configs = Object.entries(configContents)
    .map(([name, content]) => `--- ${name} ---\n${content.substring(0, 1000)}`)
    .join("\n\n");

  const prompt = [
    `Repository: ${repoName}`,
    `\nREADME:\n${readme.substring(0, 4000)}`,
    `\nFile tree (${tree.length} files, showing first 150):\n${treePreview}`,
    configs ? `\nConfig files:\n${configs}` : "",
  ].join("\n");

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-lite-001",
          messages: [
            { role: "system", content: REPO_SUMMARY_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) throw new Error(`Summary generation failed: ${response.status}`);

    const data = await response.json();
    logOpenRouterUsage(
      data,
      "fetch-github-repo/summary",
      "google/gemini-2.0-flash-lite-001"
    );

    return data.choices?.[0]?.message?.content || `Repository ${repoName} with ${tree.length} files.`;
  } catch (err) {
    console.error("Summary generation error:", err);
    return `Repository ${repoName} with ${tree.length} files. Summary generation failed.`;
  }
}

// ─── Main Handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { repoUrl, sessionId, depth, userContext } = await req.json();

    if (!repoUrl) {
      return errorResponse("Missing required field: repoUrl", 400);
    }

    const parsed = parseRepoInput(repoUrl);
    if (!parsed) {
      return errorResponse("Invalid repository format. Use 'owner/repo' or a GitHub URL.", 400);
    }

    const { owner, repo } = parsed;
    const repoFullName = `${owner}/${repo}`;
    console.log(`Fetching repo: ${repoFullName}, depth: ${depth || "auto"}`);

    // 1. Check if repo is already indexed in FHE Supabase
    const fheResult = await checkFheIndex(repoFullName);
    if (fheResult.indexed && fheResult.chunks?.length) {
      console.log(`Found ${repoFullName} in FHE index, using existing embeddings`);
      const summary = await generateSummary(
        repoFullName,
        fheResult.chunks.join("\n\n"),
        [],
        {}
      );
      return jsonResponse({
        success: true,
        summary,
        filesProcessed: 0,
        chunksCreated: 0,
        tree: [],
        resolvedDepth: "summary",
        source: "fhe_index",
      });
    }

    // 2. Fetch repo metadata and tree from GitHub
    const defaultBranch = await getDefaultBranch(owner, repo);
    console.log(`Default branch: ${defaultBranch}`);

    const fullTree = await getRepoTree(owner, repo, defaultBranch);
    const allPaths = fullTree
      .filter((e) => e.type === "blob")
      .map((e) => e.path);
    console.log(`Found ${allPaths.length} files in repo`);

    // 3. Fetch priority files (README, configs)
    const readme = await fetchFileContent(owner, repo, "README.md") ||
      await fetchFileContent(owner, repo, "readme.md") || "";

    const configContents: Record<string, string> = {};
    for (const configFile of PRIORITY_FILES.slice(3)) {
      if (allPaths.includes(configFile)) {
        const content = await fetchFileContent(owner, repo, configFile);
        if (content) configContents[configFile] = content;
      }
    }

    // 4. Resolve depth
    let resolvedDepth: "summary" | "deep";
    if (depth === "summary") {
      resolvedDepth = "summary";
    } else if (depth === "deep") {
      resolvedDepth = "deep";
    } else {
      resolvedDepth = await classifyDepth(readme, allPaths, userContext);
    }
    console.log(`Resolved depth: ${resolvedDepth}`);

    // 5a. Summary mode — generate overview only
    if (resolvedDepth === "summary") {
      const summary = await generateSummary(
        repoFullName,
        readme,
        allPaths,
        configContents
      );
      return jsonResponse({
        success: true,
        summary,
        filesProcessed: 0,
        chunksCreated: 0,
        tree: allPaths.slice(0, 200),
        resolvedDepth: "summary",
      });
    }

    // 5b. Deep mode — fetch, chunk, embed, store
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const indexableFiles = allPaths.filter(shouldIndexFile);
    console.log(`${indexableFiles.length} indexable files for deep indexing`);

    let totalChunks = 0;
    let filesProcessed = 0;

    // Process files in batches
    for (let i = 0; i < indexableFiles.length; i += FILE_BATCH_SIZE) {
      const batch = indexableFiles.slice(i, i + FILE_BATCH_SIZE);

      // Fetch file contents in parallel
      const fileContents = await Promise.all(
        batch.map(async (path) => {
          const content = await fetchFileContent(owner, repo, path);
          return content ? { path, content } : null;
        })
      );

      // Chunk all files in this batch
      const batchChunks: (CodeChunk & { file_path: string })[] = [];
      for (const file of fileContents) {
        if (!file) continue;
        filesProcessed++;
        const chunks = chunkFile(file.path, file.content);
        for (const chunk of chunks) {
          batchChunks.push({ ...chunk, file_path: file.path });
        }
      }

      if (batchChunks.length === 0) continue;

      // Prepare texts for embedding
      const texts = batchChunks.map((c) =>
        c.chunk_name
          ? `// File: ${c.file_path}\n// ${c.chunk_type}: ${c.chunk_name}\n${c.content}`
          : `// File: ${c.file_path}\n${c.content}`
      );

      // Embed in sub-batches
      const embeddings = await embedCode(texts);

      // Store in prd_document_chunks
      const rows = batchChunks.map((chunk, idx) => ({
        session_id: sessionId || null,
        file_name: chunk.file_path,
        file_type: chunk.language,
        chunk_index: idx,
        chunk_text: texts[idx].substring(0, 10000),
        keywords: [chunk.chunk_type, chunk.language, ...(chunk.chunk_name ? [chunk.chunk_name] : [])],
        embedding: embeddings[idx] ? `[${embeddings[idx]!.join(",")}]` : null,
        source_type: "github_repo",
        repo_name: repoFullName,
      }));

      const { error: insertError } = await supabase
        .from("prd_document_chunks")
        .insert(rows);

      if (insertError) {
        console.error(`Failed to store chunks batch ${i}: ${insertError.message}`);
      } else {
        totalChunks += rows.length;
      }

      console.log(
        `Processed files ${i + 1}-${Math.min(i + FILE_BATCH_SIZE, indexableFiles.length)} of ${indexableFiles.length} (${totalChunks} chunks total)`
      );
    }

    // Generate summary even for deep mode (for voice injection)
    const summary = await generateSummary(
      repoFullName,
      readme,
      allPaths,
      configContents
    );

    logVoyageUsage("fetch-github-repo/embed", "voyage-code-3", undefined, sessionId);

    console.log(
      `Deep indexing complete: ${filesProcessed} files, ${totalChunks} chunks for ${repoFullName}`
    );

    return jsonResponse({
      success: true,
      summary,
      filesProcessed,
      chunksCreated: totalChunks,
      tree: allPaths.slice(0, 200),
      resolvedDepth: "deep",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching repo:", errorMessage);
    return errorResponse(errorMessage);
  }
});
