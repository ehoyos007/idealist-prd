import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateApiKey } from "../_shared/auth.ts";
import { buildRemixPrompt, VOICE_AGENT_PROMPT } from "../_shared/prompts.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const ELEVENLABS_AGENT_ID = Deno.env.get('ELEVENLABS_AGENT_ID');

    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY is not set');
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    if (!ELEVENLABS_AGENT_ID) {
      console.error('ELEVENLABS_AGENT_ID is not set');
      throw new Error('ELEVENLABS_AGENT_ID is not configured');
    }

    // Parse request body for optional project context (for remixing)
    let projectContext = null;
    try {
      const body = await req.json();
      projectContext = body?.projectContext;
    } catch {
      // No body or invalid JSON - that's fine for new sessions
    }

    console.log('Requesting conversation token from ElevenLabs...', projectContext ? '(remix mode)' : '(new project)');

    // Always pass overrideConfig so prompts are version-controlled in code
    const overridePrompt = projectContext
      ? buildRemixPrompt(projectContext)
      : VOICE_AGENT_PROMPT;

    const overrideConfig = {
      agent: {
        prompt: {
          prompt: overridePrompt,
        },
      },
    };

    // Request a signed conversation token from ElevenLabs
    const tokenUrl = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`;

    const response = await fetch(tokenUrl, {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('ElevenLabs conversation token received successfully');

    return jsonResponse({
      token: data.signed_url || data.token,
      agentId: ELEVENLABS_AGENT_ID,
      overrideConfig,
    });
  } catch (error) {
    console.error("Error generating token:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(errorMessage);
  }
});
