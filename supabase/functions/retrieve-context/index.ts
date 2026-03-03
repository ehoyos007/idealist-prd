import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { validateApiKey } from "../_shared/auth.ts";
import { QUERY_KEYWORD_PROMPT, QUERY_EXPANSION_PROMPT } from "../_shared/prompts.ts";
import { logOpenRouterUsage } from "../_shared/usage.ts";

async function extractQueryKeywords(query: string, apiKey: string): Promise<string[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-001",
        messages: [
          { role: "system", content: QUERY_KEYWORD_PROMPT },
          { role: "user", content: query }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Query keyword extraction failed:", response.status);
      return query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    }

    const data = await response.json();
    logOpenRouterUsage(data, 'retrieve-context/keywords', 'google/gemini-2.0-flash-lite-001');
    const content = data.choices?.[0]?.message?.content || "[]";

    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
    if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);

    const keywords = JSON.parse(cleanContent.trim());
    return Array.isArray(keywords) ? keywords.map((k: string) => k.toLowerCase()) : [];
  } catch (error) {
    console.error("Error extracting query keywords:", error);
    return query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  }
}

// A10: Query expansion — generate alternative phrasings
async function expandQuery(query: string, apiKey: string): Promise<string[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-001",
        messages: [
          { role: "system", content: QUERY_EXPANSION_PROMPT },
          { role: "user", content: query }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Query expansion failed:", response.status);
      return [];
    }

    const data = await response.json();
    logOpenRouterUsage(data, 'retrieve-context/expansion', 'google/gemini-2.0-flash-lite-001');
    const content = data.choices?.[0]?.message?.content || "[]";

    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
    if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);

    const expanded = JSON.parse(cleanContent.trim());
    return Array.isArray(expanded) ? expanded : [];
  } catch (error) {
    console.error("Error expanding query:", error);
    return [];
  }
}

async function embedQuery(
  query: string,
  voyageApiKey: string
): Promise<number[] | null> {
  try {
    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${voyageApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "voyage-3-large",
        input: [query],
        input_type: "query",
      }),
    });

    if (!response.ok) {
      console.error(`Voyage query embedding failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding ?? null;
  } catch (error) {
    console.error("Voyage query embedding error:", error);
    return null;
  }
}

interface ChunkCandidate {
  id: string;
  file_name: string;
  chunk_index: number;
  chunk_text: string;
  keywords?: string[];
  similarity?: number;
}

async function rerank(
  query: string,
  documents: ChunkCandidate[],
  topK: number,
  voyageApiKey: string
): Promise<ChunkCandidate[]> {
  if (documents.length === 0) return [];
  try {
    const response = await fetch("https://api.voyageai.com/v1/rerank", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${voyageApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "rerank-2",
        query,
        documents: documents.map(d => d.chunk_text),
        top_k: topK,
      }),
    });

    if (!response.ok) {
      console.error(`Voyage rerank failed: ${response.status}`);
      return documents.slice(0, topK);
    }

    const data = await response.json();
    return data.data.map((r: { index: number }) => documents[r.index]);
  } catch (error) {
    console.error("Voyage rerank error:", error);
    return documents.slice(0, topK);
  }
}

function keywordFallbackSearch(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  queryKeywords: string[],
  limit: number
) {
  return {
    async search(): Promise<{ chunks: ChunkCandidate[]; method: string }> {
      // Keyword array overlap
      const { data: keywordMatches, error: keywordError } = await supabase
        .from('prd_document_chunks')
        .select('id, file_name, chunk_index, chunk_text, keywords')
        .eq('session_id', sessionId)
        .overlaps('keywords', queryKeywords);

      if (keywordError) {
        console.error('Keyword search error:', keywordError);
      }

      // Full-text search on chunk_text
      const searchTerms = queryKeywords.join(' | ');
      const { data: textMatches, error: textError } = await supabase
        .from('prd_document_chunks')
        .select('id, file_name, chunk_index, chunk_text, keywords')
        .eq('session_id', sessionId)
        .textSearch('chunk_text', searchTerms, { type: 'websearch' });

      if (textError) {
        console.error('Text search error:', textError);
      }

      // Combine and deduplicate
      const allMatches = [...(keywordMatches || []), ...(textMatches || [])];
      const uniqueMatches = new Map<string, ChunkCandidate & { score: number }>();

      for (const match of allMatches) {
        if (!uniqueMatches.has(match.id)) {
          const matchingKeywords = match.keywords?.filter((k: string) =>
            queryKeywords.includes(k.toLowerCase())
          ) || [];
          uniqueMatches.set(match.id, { ...match, score: matchingKeywords.length });
        } else {
          const existing = uniqueMatches.get(match.id)!;
          existing.score += 1;
        }
      }

      const ranked = Array.from(uniqueMatches.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return { chunks: ranked, method: "keyword" };
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const authError = validateApiKey(req);
  if (authError) return authError;

  try {
    const { query, sessionId, projectId, limit = 3 } = await req.json();

    if (!query || !sessionId) {
      throw new Error('Missing required fields: query, sessionId');
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY');

    if (!OPENROUTER_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Retrieving context for session: ${sessionId}, query: "${query.substring(0, 50)}..."`);

    // Extract keywords (used for fallback and observability)
    const queryKeywords = await extractQueryKeywords(query, OPENROUTER_API_KEY);
    console.log(`Query keywords: ${queryKeywords.join(', ')}`);

    if (queryKeywords.length === 0) {
      return jsonResponse({ success: true, chunks: [], queryKeywords, retrievalMethod: "none" });
    }

    let retrievalMethod = "keyword";
    let candidates: ChunkCandidate[] = [];

    // A10: Query expansion — embed original + expanded queries for broader recall
    if (VOYAGE_API_KEY) {
      const expandedQueries = await expandQuery(query, OPENROUTER_API_KEY);
      const allQueries = [query, ...expandedQueries];
      console.log(`Query expansion: ${allQueries.length} variants (original + ${expandedQueries.length} expanded)`);

      // Embed all query variants
      const allCandidates = new Map<string, ChunkCandidate>();

      for (const q of allQueries) {
        const queryEmbedding = await embedQuery(q, VOYAGE_API_KEY);
        if (!queryEmbedding) continue;

        const { data: vectorResults, error: vectorError } = await supabase
          .rpc('match_document_chunks', {
            query_embedding: queryEmbedding,
            match_session_id: sessionId,
            match_threshold: 0.4,
            match_count: 10,
          });

        if (vectorError) {
          console.error('Vector search error:', vectorError);
          continue;
        }

        if (vectorResults) {
          for (const result of vectorResults) {
            const existing = allCandidates.get(result.id);
            if (!existing || (result.similarity && (!existing.similarity || result.similarity > existing.similarity))) {
              allCandidates.set(result.id, result);
            }
          }
        }
      }

      // Also search project-scoped chunks (Supabase schema, linked repo data)
      if (projectId) {
        for (const q of allQueries) {
          const queryEmbedding = await embedQuery(q, VOYAGE_API_KEY);
          if (!queryEmbedding) continue;

          const { data: projectResults, error: projectError } = await supabase
            .rpc('match_document_chunks_by_project', {
              query_embedding: queryEmbedding,
              match_project_id: projectId,
              match_threshold: 0.4,
              match_count: 5,
            });

          if (projectError) {
            console.error('Project-scoped vector search error:', projectError);
            continue;
          }

          if (projectResults) {
            for (const result of projectResults) {
              const existing = allCandidates.get(result.id);
              if (!existing || (result.similarity && (!existing.similarity || result.similarity > existing.similarity))) {
                allCandidates.set(result.id, result);
              }
            }
          }
        }
      }

      if (allCandidates.size > 0) {
        candidates = Array.from(allCandidates.values());
        retrievalMethod = "vector";
        console.log(`Vector search (with expansion) returned ${candidates.length} unique candidates`);
      }
    }

    // Stage 3: Keyword fallback if vector returned nothing
    if (candidates.length === 0) {
      console.log("Falling back to keyword search");
      const fallback = keywordFallbackSearch(supabase, sessionId, queryKeywords, limit);
      const result = await fallback.search();
      candidates = result.chunks;
      retrievalMethod = result.method;
      console.log(`Keyword fallback returned ${candidates.length} results`);
    }

    // Stage 4: Rerank via Voyage (if we have candidates and API key)
    let finalChunks: ChunkCandidate[];
    if (VOYAGE_API_KEY && candidates.length > limit) {
      finalChunks = await rerank(query, candidates, limit, VOYAGE_API_KEY);
      console.log(`Reranked to ${finalChunks.length} chunks`);
    } else {
      finalChunks = candidates.slice(0, limit);
    }

    const responseChunks = finalChunks.map(({ id, file_name, chunk_index, chunk_text }) => ({
      id,
      fileName: file_name,
      chunkIndex: chunk_index,
      text: chunk_text,
    }));

    console.log(`Returning ${responseChunks.length} chunks (method: ${retrievalMethod})`);

    return jsonResponse({
      success: true,
      chunks: responseChunks,
      queryKeywords,
      retrievalMethod,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error retrieving context:', errorMessage);
    return errorResponse(errorMessage);
  }
});
