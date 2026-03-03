-- ============================================================
-- Add repo source columns for GitHub repository indexing
-- ============================================================

-- 1. Add source_type and repo_name to prd_document_chunks
ALTER TABLE public.prd_document_chunks
ADD COLUMN source_type text DEFAULT 'file',
ADD COLUMN repo_name text;

-- 2. Add source_type and repo_url to prd_project_documents
ALTER TABLE public.prd_project_documents
ADD COLUMN source_type text DEFAULT 'file',
ADD COLUMN repo_url text;

-- 3. Create index on repo_name for fast lookups
CREATE INDEX idx_prd_document_chunks_repo_name
ON public.prd_document_chunks (repo_name)
WHERE repo_name IS NOT NULL;
