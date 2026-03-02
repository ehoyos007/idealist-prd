import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateApiKey } from "../_shared/auth.ts";
import { SYNTHESIS_SYSTEM_PROMPT, SYNTHESIS_SPARSE_WARNING } from "../_shared/prompts.ts";
import { logOpenRouterUsage } from "../_shared/usage.ts";

const tools = [
  {
    type: "function" as const,
    function: {
      name: "create_project_card",
      description: "Create a structured project requirement document (PRD) from conversation analysis",
      parameters: {
        type: "object",
        properties: {
          projectName: { type: "string", description: "Short project name (max 6 words)" },
          tagline: { type: "string", description: "One-line description of the project" },
          tags: { type: "array", items: { type: "string" }, description: "2-5 quick indicators like 'MVP Ready', 'AI-Powered', 'Developer Tool', 'Mobile First', 'B2B SaaS', 'High Impact', 'Low Complexity'" },
          vision: { type: "string", description: "1-2 paragraphs describing the long-term vision for the project" },
          problemStatement: { type: "string", description: "2-3 paragraphs clearly defining the problem being solved. Make it compelling and well-defined." },
          targetUser: { type: "string", description: "Detailed persona description of the primary target user" },
          userStories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                persona: { type: "string", description: "The user role or persona" },
                goal: { type: "string", description: "What they want to accomplish" },
                benefit: { type: "string", description: "Why they want to accomplish it" }
              },
              required: ["persona", "goal", "benefit"]
            },
            description: "User stories in 'As a [persona], I want to [goal], so that [benefit]' format"
          },
          coreFeatures: { type: "string", description: "Detailed list of core features the project should include" },
          techStack: { type: "string", description: "Recommended technologies and frameworks for building the project" },
          architecture: { type: "string", description: "How the technical pieces fit together - system design overview" },
          successMetrics: { type: "string", description: "KPIs and success criteria for measuring project outcomes" },
          risksAndOpenQuestions: { type: "string", description: "Unknowns, risks, and open questions that need to be resolved" },
          firstSprintPlan: { type: "string", description: "Very specific and actionable plan for what to build in the first 1-2 weeks" },
          scores: {
            type: "object",
            properties: {
              complexity: { type: "integer", description: "1-10 score for implementation complexity" },
              impact: { type: "integer", description: "1-10 score for potential impact" },
              urgency: { type: "integer", description: "1-10 score for time sensitivity" },
              confidence: { type: "integer", description: "1-10 score for confidence in the approach" }
            },
            required: ["complexity", "impact", "urgency", "confidence"]
          }
        },
        required: [
          "projectName", "tagline", "tags", "vision", "problemStatement",
          "targetUser", "userStories", "coreFeatures", "techStack",
          "architecture", "successMetrics", "risksAndOpenQuestions",
          "firstSprintPlan", "scores"
        ]
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { transcript } = await req.json();

    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript provided');
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    console.log('Synthesizing project from transcript using Gemini 2.5 Pro via OpenRouter...');

    // A7: Transcript length validation
    const wordCount = transcript.split(/\s+/).length;
    const messageCount = (transcript.match(/^(User|AI):/gm) || []).length;
    const isSparse = wordCount < 100 || messageCount < 4;

    const systemPrompt = isSparse
      ? SYNTHESIS_SYSTEM_PROMPT + SYNTHESIS_SPARSE_WARNING
      : SYNTHESIS_SYSTEM_PROMPT;

    if (isSparse) {
      console.log(`Sparse transcript detected: ${wordCount} words, ${messageCount} messages`);
    }

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
          { role: "user", content: `Here is the conversation transcript:\n\n${transcript}\n\nPlease analyze this conversation and create a structured project requirement document.` }
        ],
        tools,
        tool_choice: { type: "function", function: { name: "create_project_card" } },
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

    logOpenRouterUsage(aiResponse, 'synthesize-project', 'google/gemini-2.5-pro-preview-06-05');

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== 'create_project_card') {
      console.error('No valid tool call in response:', JSON.stringify(aiResponse, null, 2));
      throw new Error('AI did not return a valid project card');
    }

    let projectCard;
    try {
      projectCard = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError);
      throw new Error('Failed to parse project card from AI response');
    }

    console.log('Project card synthesized successfully:', projectCard.projectName);

    return jsonResponse({ projectCard });
  } catch (error) {
    console.error("Error synthesizing project:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(errorMessage);
  }
});
