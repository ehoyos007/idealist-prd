import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateApiKey } from "../_shared/auth.ts";
import { VISION_SYNTHESIS_PROMPT, SYNTHESIS_SPARSE_WARNING } from "../_shared/prompts.ts";
import { logOpenRouterUsage } from "../_shared/usage.ts";

const tools = [
  {
    type: "function" as const,
    function: {
      name: "create_vision_docs",
      description: "Create VISION.md and EVAL.md documents from a vision coaching conversation",
      parameters: {
        type: "object",
        properties: {
          visionMd: { type: "string", description: "The full VISION.md document content" },
          evalMd: { type: "string", description: "The full EVAL.md document content" },
        },
        required: ["visionMd", "evalMd"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { transcript, projectContext } = await req.json();

    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript provided');
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    console.log('Synthesizing vision docs from transcript using Gemini 2.5 Pro via OpenRouter...');

    // Transcript length validation (same thresholds as synthesize-project)
    const wordCount = transcript.split(/\s+/).length;
    const messageCount = (transcript.match(/^(User|AI):/gm) || []).length;
    const isSparse = wordCount < 100 || messageCount < 4;

    const systemPrompt = isSparse
      ? VISION_SYNTHESIS_PROMPT + SYNTHESIS_SPARSE_WARNING
      : VISION_SYNTHESIS_PROMPT;

    if (isSparse) {
      console.log(`Sparse transcript detected: ${wordCount} words, ${messageCount} messages`);
    }

    const userContent = projectContext
      ? `Here is the existing PRD context:\n\n${JSON.stringify(projectContext, null, 2)}\n\nHere is the vision coaching conversation transcript:\n\n${transcript}\n\nPlease analyze this conversation and create the VISION.md and EVAL.md documents.`
      : `Here is the vision coaching conversation transcript:\n\n${transcript}\n\nPlease analyze this conversation and create the VISION.md and EVAL.md documents.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro-preview-06-05",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "create_vision_docs" } },
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      if (response.status === 429) {
        return errorResponse("Rate limits exceeded, please try again later.", 429);
      }
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI response received');

    logOpenRouterUsage(aiResponse, 'synthesize-vision', 'google/gemini-2.5-pro-preview-06-05');

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== 'create_vision_docs') {
      console.error('No valid tool call in response:', JSON.stringify(aiResponse, null, 2));
      throw new Error('AI did not return valid vision documents');
    }

    let visionDocs;
    try {
      visionDocs = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError);
      throw new Error('Failed to parse vision documents from AI response');
    }

    console.log('Vision documents synthesized successfully');

    return jsonResponse({ visionMd: visionDocs.visionMd, evalMd: visionDocs.evalMd });
  } catch (error) {
    console.error("Error synthesizing vision docs:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(errorMessage);
  }
});
