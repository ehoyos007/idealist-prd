import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const tools = [
  {
    type: "function",
    function: {
      name: "create_project_card",
      description: "Create a structured project requirement document (PRD) from conversation analysis",
      parameters: {
        type: "object",
        properties: {
          projectName: {
            type: "string",
            description: "Short project name (max 6 words)"
          },
          tagline: {
            type: "string",
            description: "One-line description of the project"
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "2-5 quick indicators like 'MVP Ready', 'AI-Powered', 'Developer Tool', 'Mobile First', 'B2B SaaS', 'High Impact', 'Low Complexity'"
          },
          vision: {
            type: "string",
            description: "1-2 paragraphs describing the long-term vision for the project"
          },
          problemStatement: {
            type: "string",
            description: "2-3 paragraphs clearly defining the problem being solved. Make it compelling and well-defined."
          },
          targetUser: {
            type: "string",
            description: "Detailed persona description of the primary target user"
          },
          userStories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                persona: { type: "string", description: "The user role or persona" },
                goal: { type: "string", description: "What they want to accomplish" },
                benefit: { type: "string", description: "Why they want to accomplish it" }
              },
              required: ["persona", "goal", "benefit"],
              additionalProperties: false
            },
            description: "User stories in 'As a [persona], I want to [goal], so that [benefit]' format"
          },
          coreFeatures: {
            type: "string",
            description: "Detailed list of core features the project should include"
          },
          techStack: {
            type: "string",
            description: "Recommended technologies and frameworks for building the project"
          },
          architecture: {
            type: "string",
            description: "How the technical pieces fit together - system design overview"
          },
          successMetrics: {
            type: "string",
            description: "KPIs and success criteria for measuring project outcomes"
          },
          risksAndOpenQuestions: {
            type: "string",
            description: "Unknowns, risks, and open questions that need to be resolved"
          },
          firstSprintPlan: {
            type: "string",
            description: "Very specific and actionable plan for what to build in the first 1-2 weeks"
          },
          scores: {
            type: "object",
            properties: {
              complexity: { type: "integer", description: "1-10 score for implementation complexity" },
              impact: { type: "integer", description: "1-10 score for potential impact" },
              urgency: { type: "integer", description: "1-10 score for time sensitivity" },
              confidence: { type: "integer", description: "1-10 score for confidence in the approach" }
            },
            required: ["complexity", "impact", "urgency", "confidence"],
            additionalProperties: false
          }
        },
        required: [
          "projectName", "tagline", "tags", "vision", "problemStatement",
          "targetUser", "userStories", "coreFeatures", "techStack",
          "architecture", "successMetrics", "risksAndOpenQuestions",
          "firstSprintPlan", "scores"
        ],
        additionalProperties: false
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();

    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Synthesizing project from transcript using gemini-2.5-pro with tool calling...');

    const systemPrompt = `You are an expert at analyzing product brainstorming conversations and synthesizing them into structured, actionable project requirement documents (PRDs).

Guidelines:
- All scores should be 1-10, be honest based on the information provided
- If information is missing for a section, make reasonable inferences or note what's unclear
- Keep the tone professional but actionable
- Make the problem statement particularly compelling and well-defined
- User stories should follow the "As a [persona], I want to [goal], so that [benefit]" format
- Tags should be quick indicators like "MVP Ready", "AI-Powered", "Developer Tool", "Mobile First", "B2B SaaS", "High Impact", "Low Complexity"
- The first sprint plan should be very specific and actionable

Use the create_project_card function to structure your analysis.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the conversation transcript:\n\n${transcript}\n\nPlease analyze this conversation and create a structured project requirement document.` }
        ],
        tools: tools,
        tool_choice: { type: "function", function: { name: "create_project_card" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    console.log('AI response received:', JSON.stringify(aiResponse, null, 2));

    // Extract project card from tool call response
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== 'create_project_card') {
      console.error('No valid tool call in response:', aiResponse);
      throw new Error('AI did not return a valid project card');
    }

    let projectCard;
    try {
      projectCard = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError);
      console.error('Raw arguments:', toolCall.function.arguments);
      throw new Error('Failed to parse project card from AI response');
    }

    console.log('Project card synthesized successfully via tool calling');

    return new Response(JSON.stringify({ projectCard }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error synthesizing project:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
