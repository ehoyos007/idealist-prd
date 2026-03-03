import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";

const GITHUB_API = "https://api.github.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase config");
    }

    // Get user's GitHub token from their profile
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing Authorization header", 401);
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user ID from JWT
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return errorResponse("Invalid auth token", 401);
    }

    // Get GitHub token from profile
    const { data: profile, error: profileError } = await serviceClient
      .from("idealist_profiles")
      .select("github_access_token, github_username")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.github_access_token) {
      return errorResponse("No GitHub token found. Please re-authenticate with GitHub.", 400);
    }

    const githubToken = profile.github_access_token;
    const githubUsername = profile.github_username;

    // Parse request body
    const { query, page = 1, perPage = 30 } = await req.json().catch(() => ({}));

    let githubUrl: string;

    if (query && query.trim()) {
      // Search user's repos
      const q = encodeURIComponent(`${query} user:${githubUsername}`);
      githubUrl = `${GITHUB_API}/search/repositories?q=${q}&sort=updated&per_page=${perPage}&page=${page}`;
    } else {
      // List user's repos sorted by recently updated
      githubUrl = `${GITHUB_API}/user/repos?sort=updated&type=owner&per_page=${perPage}&page=${page}`;
    }

    const response = await fetch(githubUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub API error:", response.status, errorText);

      if (response.status === 401) {
        return errorResponse("GitHub token expired. Please sign out and sign in again.", 401);
      }
      return errorResponse(`GitHub API error: ${response.status}`, response.status);
    }

    const data = await response.json();

    // Normalize response (search endpoint wraps in { items: [] })
    const rawRepos = query ? data.items : data;

    const repos = (rawRepos || []).map((repo: Record<string, unknown>) => ({
      name: repo.name,
      fullName: repo.full_name,
      isPrivate: repo.private,
      description: repo.description,
      language: repo.language,
      updatedAt: repo.updated_at,
      defaultBranch: repo.default_branch,
      stargazersCount: repo.stargazers_count,
    }));

    // Check if there are more pages via Link header
    const linkHeader = response.headers.get("Link");
    const hasMore = linkHeader?.includes('rel="next"') ?? false;

    return jsonResponse({ repos, hasMore });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("list-github-repos error:", msg);
    return errorResponse(msg);
  }
});
