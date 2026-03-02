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
    const { fileContent, fileName, fileType } = await req.json();

    if (!fileContent || !fileName) {
      throw new Error('Missing required fields: fileContent, fileName');
    }

    console.log(`Processing file: ${fileName} (${fileType})`);

    // For text-based files, return content directly
    const textTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv'];
    if (textTypes.some(t => fileType?.startsWith(t)) || fileName.match(/\.(txt|md|json|csv)$/i)) {
      let textContent = fileContent;
      if (fileContent.includes('base64,')) {
        const base64Data = fileContent.split('base64,')[1];
        textContent = atob(base64Data);
      }

      return new Response(
        JSON.stringify({ success: true, extractedText: textContent, fileName }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // Extract base64 data and MIME type from data URL
    let base64Data: string;
    let mimeType: string;

    if (fileContent.startsWith('data:')) {
      const match = fileContent.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        throw new Error('Invalid data URL format');
      }
    } else {
      base64Data = fileContent;
      mimeType = fileType || 'application/octet-stream';
    }

    // Build messages with multimodal content for images
    let messages: Record<string, unknown>[];

    if (fileType?.startsWith('image/')) {
      messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that describes images in detail for context in a product brainstorming session. Focus on any text, diagrams, charts, or relevant visual information.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please describe this image in detail, extracting any text, data, or relevant information that could be useful for developing a product idea. File: ${fileName}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            }
          ]
        }
      ];
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // PDFs: send as base64 in a text message with instruction to extract
      // OpenRouter/Gemini supports PDF via multimodal
      messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts and summarizes document content for context in a product brainstorming session. Be thorough and detailed.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please extract and summarize all text content from this PDF document. Focus on key information, data points, and insights. File: ${fileName}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Data}`
              }
            }
          ]
        }
      ];
    } else {
      messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that processes documents for context in a product brainstorming session.'
        },
        {
          role: 'user',
          content: `The user has uploaded a file named "${fileName}" of type "${fileType}". Please acknowledge this file and provide any useful context you can infer from the filename and type.`
        }
      ];
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro-preview-06-05",
        messages,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`AI processing failed: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || `File uploaded: ${fileName}`;

    console.log(`Successfully processed ${fileName}`);

    return new Response(
      JSON.stringify({ success: true, extractedText, fileName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing file:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
