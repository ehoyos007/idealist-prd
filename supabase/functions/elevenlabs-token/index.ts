import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Build override prompt if remixing an existing project
    let overrideConfig: Record<string, unknown> | undefined;

    if (projectContext) {
      const overridePrompt = `The user wants to REMIX an existing project they've developed. Your goal is to help them iterate, pivot, or expand on this concept.

## EXISTING PROJECT CONTEXT:
**Project Name:** ${projectContext.projectName || 'Not specified'}
**Tagline:** ${projectContext.tagline || 'Not specified'}
**Tags:** ${projectContext.tags?.join(', ') || 'None'}

**Vision:**
${projectContext.vision || 'Not specified'}

**Problem Statement:**
${projectContext.problemStatement || 'Not specified'}

**Target User:**
${projectContext.targetUser || 'Not specified'}

**User Stories:**
${projectContext.userStories?.map((s: { persona: string; goal: string; benefit: string }) => `- As a ${s.persona}, I want to ${s.goal}, so that ${s.benefit}`).join('\n') || 'Not specified'}

**Core Features:**
${projectContext.coreFeatures || 'Not specified'}

**Tech Stack:**
${projectContext.techStack || 'Not specified'}

**Architecture:**
${projectContext.architecture || 'Not specified'}

**Success Metrics:**
${projectContext.successMetrics || 'Not specified'}

**Risks & Open Questions:**
${projectContext.risksAndOpenQuestions || 'Not specified'}

**First Sprint Plan:**
${projectContext.firstSprintPlan || 'Not specified'}

**Scores:**
- Complexity: ${projectContext.scores?.complexity || 'N/A'}/10
- Impact: ${projectContext.scores?.impact || 'N/A'}/10
- Urgency: ${projectContext.scores?.urgency || 'N/A'}/10
- Confidence: ${projectContext.scores?.confidence || 'N/A'}/10

## YOUR ROLE:
Start by acknowledging you've reviewed their existing project "${projectContext.projectName}" and ask what aspects they'd like to change or explore. They might want to:
- Pivot to a different market or audience
- Add new features or capabilities
- Change the technical architecture
- Explore variations or spin-offs
- Address weaknesses or risks in the current concept

Ask targeted questions based on what they want to change. When you have enough information about their new direction, summarize the updated concept and let them know they can end the session to generate a new project card.

Keep responses concise - this is a voice conversation. Avoid long monologues.`;

      overrideConfig = {
        agent: {
          prompt: {
            prompt: overridePrompt,
          },
        },
      };
    }

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

    return new Response(JSON.stringify({
      token: data.signed_url || data.token,
      agentId: ELEVENLABS_AGENT_ID,
      ...(overrideConfig ? { overrideConfig } : {}),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error generating token:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
