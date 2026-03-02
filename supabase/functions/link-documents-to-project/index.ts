import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, projectId } = await req.json();

    if (!sessionId || !projectId) {
      throw new Error('Missing required fields: sessionId, projectId');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Linking documents from session ${sessionId} to project ${projectId}`);

    // Get all chunks for this session to find unique files
    const { data: chunks, error: fetchError } = await supabase
      .from('prd_document_chunks')
      .select('file_name, file_type')
      .eq('session_id', sessionId);

    if (fetchError) {
      throw new Error(`Failed to fetch chunks: ${fetchError.message}`);
    }

    if (!chunks || chunks.length === 0) {
      console.log('No document chunks found for session');
      return new Response(
        JSON.stringify({ success: true, linkedDocuments: 0, totalChunks: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update all chunks to link to the project
    const { error: updateError } = await supabase
      .from('prd_document_chunks')
      .update({ project_id: projectId })
      .eq('session_id', sessionId);

    if (updateError) {
      throw new Error(`Failed to update chunks: ${updateError.message}`);
    }

    // Get unique files and their chunk counts
    const fileStats = new Map<string, { file_type: string | null; count: number }>();
    for (const chunk of chunks) {
      const existing = fileStats.get(chunk.file_name);
      if (existing) {
        existing.count++;
      } else {
        fileStats.set(chunk.file_name, { file_type: chunk.file_type, count: 1 });
      }
    }

    // Create project_documents records
    const documentRecords = Array.from(fileStats.entries()).map(([fileName, stats]) => ({
      project_id: projectId,
      file_name: fileName,
      file_type: stats.file_type,
      chunk_count: stats.count
    }));

    const { error: insertError } = await supabase
      .from('prd_project_documents')
      .insert(documentRecords);

    if (insertError) {
      console.error('Failed to insert project_documents:', insertError);
      // Don't throw - chunks are already linked
    }

    console.log(`Linked ${documentRecords.length} documents with ${chunks.length} total chunks to project ${projectId}`);

    return new Response(
      JSON.stringify({
        success: true,
        linkedDocuments: documentRecords.length,
        totalChunks: chunks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error linking documents:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
