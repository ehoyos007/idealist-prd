import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateApiKey } from "../_shared/auth.ts";
import { IMAGE_PARSING_PROMPT, PDF_PARSING_PROMPT, GENERIC_FILE_PARSING_PROMPT } from "../_shared/prompts.ts";
import { logOpenRouterUsage } from "../_shared/usage.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const authError = validateApiKey(req);
  if (authError) return authError;

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

      return jsonResponse({ success: true, extractedText: textContent, fileName });
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

    // Build messages with multimodal content
    let messages: Record<string, unknown>[];

    if (fileType?.startsWith('image/')) {
      messages = [
        { role: 'system', content: IMAGE_PARSING_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image thoroughly, extracting all relevant information for product development. File: ${fileName}`
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Data}` }
            }
          ]
        }
      ];
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      messages = [
        { role: 'system', content: PDF_PARSING_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract and organize all content from this PDF document. File: ${fileName}`
            },
            {
              type: 'image_url',
              image_url: { url: `data:application/pdf;base64,${base64Data}` }
            }
          ]
        }
      ];
    } else {
      messages = [
        { role: 'system', content: GENERIC_FILE_PARSING_PROMPT },
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
    logOpenRouterUsage(data, 'parse-file-context', 'google/gemini-2.5-pro-preview-06-05');
    const extractedText = data.choices?.[0]?.message?.content || `File uploaded: ${fileName}`;

    console.log(`Successfully processed ${fileName}`);

    return jsonResponse({ success: true, extractedText, fileName });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing file:', errorMessage);
    return errorResponse(errorMessage);
  }
});
