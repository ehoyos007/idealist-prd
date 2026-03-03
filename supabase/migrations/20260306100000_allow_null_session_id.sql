-- Allow null session_id in prd_document_chunks
-- Needed for GitHub repo chunks that are indexed outside of an active session
ALTER TABLE public.prd_document_chunks ALTER COLUMN session_id DROP NOT NULL;
