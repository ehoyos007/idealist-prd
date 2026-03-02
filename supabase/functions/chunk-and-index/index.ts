import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateApiKey } from "../_shared/auth.ts";
import { KEYWORD_EXTRACTION_PROMPT } from "../_shared/prompts.ts";
import { logOpenRouterUsage, logVoyageUsage } from "../_shared/usage.ts";

const CHUNK_SIZE = 300;
const CHUNK_OVERLAP = 75;
const VOYAGE_BATCH_SIZE = 128;

function splitIntoChunks(text: string, fileName: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  if (words.length <= CHUNK_SIZE) {
    return [`[Source: ${fileName} | Section 1/1]\n${text}`];
  }

  let start = 0;
  const totalChunks = Math.ceil((words.length - CHUNK_OVERLAP) / (CHUNK_SIZE - CHUNK_OVERLAP));
  let chunkNum = 0;
  while (start < words.length) {
    chunkNum++;
    const end = Math.min(start + CHUNK_SIZE, words.length);
    const chunkText = words.slice(start, end).join(' ');
    chunks.push(`[Source: ${fileName} | Section ${chunkNum}/${totalChunks}]\n${chunkText}`);
    start = end - CHUNK_OVERLAP;
    if (start >= words.length - CHUNK_OVERLAP) break;
  }

  return chunks;
}

async function extractKeywords(text: string, apiKey: string): Promise<string[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-001",
        messages: [
          { role: "system", content: KEYWORD_EXTRACTION_PROMPT },
          { role: "user", content: text.substring(0, 2000) }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error("Keyword extraction failed:", response.status);
      return [];
    }

    const data = await response.json();
    logOpenRouterUsage(data, 'chunk-and-index/keywords', 'google/gemini-2.0-flash-lite-001');
    const content = data.choices?.[0]?.message?.content || "[]";

    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
    if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);

    const parsed = JSON.parse(cleanContent.trim());
    const keywords = Array.isArray(parsed) ? parsed : (parsed.keywords || []);
    return keywords.map((k: string) => k.toLowerCase());
  } catch (error) {
    console.error("Error extracting keywords:", error);
    return [];
  }
}

async function generateEmbeddings(
  texts: string[],
  voyageApiKey: string
): Promise<(number[] | null)[]> {
  const allEmbeddings: (number[] | null)[] = new Array(texts.length).fill(null);

  for (let i = 0; i < texts.length; i += VOYAGE_BATCH_SIZE) {
    const batch = texts.slice(i, i + VOYAGE_BATCH_SIZE);
    try {
      const response = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${voyageApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "voyage-3-large",
          input: batch,
          input_type: "document",
        }),
      });

      if (!response.ok) {
        console.error(`Voyage embedding batch ${i / VOYAGE_BATCH_SIZE} failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      for (let j = 0; j < data.data.length; j++) {
        allEmbeddings[i + j] = data.data[j].embedding;
      }
    } catch (error) {
      console.error(`Voyage embedding batch ${i / VOYAGE_BATCH_SIZE} error:`, error);
    }
  }

  return allEmbeddings;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { text, fileName, fileType, fileSize, sessionId } = await req.json();

    if (!text || !sessionId || !fileName) {
      throw new Error('Missing required fields: text, sessionId, fileName');
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY');

    if (!OPENROUTER_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Chunking document: ${fileName} for session: ${sessionId}`);

    const chunks = splitIntoChunks(text, fileName);
    console.log(`Created ${chunks.length} chunks (${CHUNK_SIZE} words, ${CHUNK_OVERLAP} overlap)`);

    // Extract keywords for each chunk
    const chunkRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const keywords = await extractKeywords(chunk, OPENROUTER_API_KEY);

      chunkRecords.push({
        session_id: sessionId,
        file_name: fileName,
        file_type: fileType || null,
        chunk_index: i,
        chunk_text: chunk,
        keywords: keywords,
        embedding: null as number[] | null,
      });

      console.log(`Processed chunk ${i + 1}/${chunks.length} with ${keywords.length} keywords`);
    }

    // Generate embeddings via Voyage AI (if key available)
    if (VOYAGE_API_KEY) {
      console.log(`Generating embeddings for ${chunks.length} chunks via Voyage AI...`);
      const embeddings = await generateEmbeddings(chunks, VOYAGE_API_KEY);
      let embeddedCount = 0;
      for (let i = 0; i < embeddings.length; i++) {
        if (embeddings[i]) {
          chunkRecords[i].embedding = embeddings[i];
          embeddedCount++;
        }
      }
      console.log(`Generated embeddings for ${embeddedCount}/${chunks.length} chunks`);
    } else {
      console.log("VOYAGE_API_KEY not set — skipping embeddings, keyword-only mode");
    }

    const { error: insertError } = await supabase
      .from('prd_document_chunks')
      .insert(chunkRecords);

    if (insertError) {
      throw new Error(`Failed to store chunks: ${insertError.message}`);
    }

    console.log(`Successfully indexed ${chunks.length} chunks for ${fileName}`);

    return jsonResponse({
      success: true,
      chunkCount: chunks.length,
      sessionId,
      fileName
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error chunking document:', errorMessage);
    return errorResponse(errorMessage);
  }
});
