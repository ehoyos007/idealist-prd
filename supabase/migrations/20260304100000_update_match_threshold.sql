-- Update match_document_chunks default threshold from 0.3 to 0.4
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding extensions.vector(1024),
  match_session_id text,
  match_threshold float DEFAULT 0.4,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  file_name text,
  chunk_index int,
  chunk_text text,
  keywords text[],
  similarity float
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT
    prd_document_chunks.id,
    prd_document_chunks.file_name,
    prd_document_chunks.chunk_index,
    prd_document_chunks.chunk_text,
    prd_document_chunks.keywords,
    1 - (prd_document_chunks.embedding <=> query_embedding) AS similarity
  FROM prd_document_chunks
  WHERE prd_document_chunks.session_id = match_session_id
    AND prd_document_chunks.embedding IS NOT NULL
    AND 1 - (prd_document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY prd_document_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;
