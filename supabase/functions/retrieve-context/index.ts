import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
          {
            role: "system",
            content: `Extract the key search terms from the user's query. Focus on nouns, concepts, and specific terms that would help find relevant document chunks. Return ONLY a JSON array of lowercase keywords.
Example input: "What does the document say about revenue projections?"
Example output: ["revenue", "projections", "financial", "forecast"]`
          },
          {
            role: "user",
            content: query
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Query keyword extraction failed:", response.status);
      return query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    }

    const data = await response.json();
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sessionId, limit = 3 } = await req.json();

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
      return new Response(
        JSON.stringify({ success: true, chunks: [], queryKeywords, retrievalMethod: "none" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let retrievalMethod = "keyword";
    let candidates: ChunkCandidate[] = [];

    // Stage 1+2: Embed query → vector search (if Voyage available)
    if (VOYAGE_API_KEY) {
      const queryEmbedding = await embedQuery(query, VOYAGE_API_KEY);

      if (queryEmbedding) {
        const { data: vectorResults, error: vectorError } = await supabase
          .rpc('match_document_chunks', {
            query_embedding: queryEmbedding,
            match_session_id: sessionId,
            match_threshold: 0.3,
            match_count: 10,
          });

        if (vectorError) {
          console.error('Vector search error:', vectorError);
        }

        if (vectorResults && vectorResults.length > 0) {
          candidates = vectorResults;
          retrievalMethod = "vector";
          console.log(`Vector search returned ${candidates.length} candidates`);
        }
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

    // Stage 4: Rerank via Voyage (if we have vector candidates and API key)
    let finalChunks: ChunkCandidate[];
    if (retrievalMethod === "vector" && VOYAGE_API_KEY && candidates.length > limit) {
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

    return new Response(
      JSON.stringify({
        success: true,
        chunks: responseChunks,
        queryKeywords,
        retrievalMethod,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error retrieving context:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, chunks: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
