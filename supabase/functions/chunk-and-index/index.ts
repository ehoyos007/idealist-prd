import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Chunking configuration
const CHUNK_SIZE = 500; // approximate words per chunk
const CHUNK_OVERLAP = 50; // words of overlap between chunks

function splitIntoChunks(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  if (words.length <= CHUNK_SIZE) {
    return [text];
  }
  
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE, words.length);
    const chunk = words.slice(start, end).join(' ');
    chunks.push(chunk);
    
    // Move start forward, accounting for overlap
    start = end - CHUNK_OVERLAP;
    if (start >= words.length - CHUNK_OVERLAP) break;
  }
  
  return chunks;
}

async function extractKeywords(text: string, apiKey: string): Promise<string[]> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Extract 5-10 important keywords from the given text. Focus on:
- Business terms and concepts
- Industry names and sectors
- Technologies and tools mentioned
- Problem statements and pain points
- Solution concepts and approaches
- Metrics and numbers
- Proper nouns (company names, product names)

Return ONLY a JSON array of lowercase keywords, no explanations.
Example: ["saas", "automation", "small business", "workflow", "productivity"]`
          },
          {
            role: "user",
            content: text.substring(0, 2000) // Limit input to first 2000 chars
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Keyword extraction failed:", response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Clean and parse
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
    if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
    
    const keywords = JSON.parse(cleanContent.trim());
    return Array.isArray(keywords) ? keywords.map((k: string) => k.toLowerCase()) : [];
  } catch (error) {
    console.error("Error extracting keywords:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, fileName, fileType, fileSize, sessionId } = await req.json();

    if (!text || !sessionId || !fileName) {
      throw new Error('Missing required fields: text, sessionId, fileName');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Chunking document: ${fileName} for session: ${sessionId}`);

    // Split text into chunks
    const chunks = splitIntoChunks(text);
    console.log(`Created ${chunks.length} chunks`);

    // Extract keywords and store each chunk
    const chunkRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const keywords = await extractKeywords(chunk, LOVABLE_API_KEY);
      
      const record = {
        session_id: sessionId,
        file_name: fileName,
        file_type: fileType || null,
        chunk_index: i,
        chunk_text: chunk,
        keywords: keywords
      };
      
      chunkRecords.push(record);
      console.log(`Processed chunk ${i + 1}/${chunks.length} with ${keywords.length} keywords`);
    }

    // Insert all chunks
    const { error: insertError } = await supabase
      .from('prd_document_chunks')
      .insert(chunkRecords);

    if (insertError) {
      throw new Error(`Failed to store chunks: ${insertError.message}`);
    }

    console.log(`Successfully indexed ${chunks.length} chunks for ${fileName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunkCount: chunks.length,
        sessionId,
        fileName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error chunking document:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
