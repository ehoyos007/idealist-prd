import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase config");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing Authorization header", 401);
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from JWT
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return errorResponse("Invalid auth token", 401);
    }

    const githubUsername = user.user_metadata?.user_name;
    const avatarUrl = user.user_metadata?.avatar_url;
    const displayName = user.user_metadata?.full_name || githubUsername;

    if (!githubUsername) {
      return errorResponse("No GitHub username found in user metadata", 400);
    }

    // Parse optional provider token from request body
    let providerToken: string | null = null;
    try {
      const body = await req.json();
      providerToken = body?.providerToken || null;
    } catch {
      // No body — that's fine
    }

    // 1. Check allowlist
    const { data: allowlistEntry, error: allowError } = await serviceClient
      .from("idealist_allowed_users")
      .select("id")
      .eq("github_username", githubUsername)
      .maybeSingle();

    if (allowError) {
      console.error("Allowlist check error:", allowError.message);
      return errorResponse("Failed to check allowlist", 500);
    }

    const allowed = !!allowlistEntry;

    // 2. Upsert profile (even if not allowed, so we have the record)
    const profileData: Record<string, unknown> = {
      id: user.id,
      github_username: githubUsername,
      github_avatar_url: avatarUrl,
      display_name: displayName,
    };

    if (providerToken) {
      profileData.github_access_token = providerToken;
    }

    const { data: profile, error: profileError } = await serviceClient
      .from("idealist_profiles")
      .upsert(profileData, { onConflict: "id" })
      .select()
      .single();

    if (profileError) {
      console.error("Profile upsert error:", profileError.message);
      // Non-fatal — still return allowlist result
    }

    return jsonResponse({
      allowed,
      profile: profile || null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("check-allowlist error:", msg);
    return errorResponse(msg);
  }
});
