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

    // Get the user's JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing Authorization header", 401);
    }

    // Create a client with the user's JWT to get their identity
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return errorResponse("Invalid auth token", 401);
    }

    const githubUsername = user.user_metadata?.user_name;
    if (!githubUsername) {
      return errorResponse("No GitHub username found in user metadata", 400);
    }

    // Use service role to check allowlist (RLS blocks client access)
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await serviceClient
      .from("idealist_allowed_users")
      .select("id")
      .eq("github_username", githubUsername)
      .maybeSingle();

    if (error) {
      console.error("Allowlist check error:", error.message);
      return errorResponse("Failed to check allowlist", 500);
    }

    return jsonResponse({ allowed: !!data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("check-allowlist error:", msg);
    return errorResponse(msg);
  }
});
