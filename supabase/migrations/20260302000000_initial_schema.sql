-- ============================================================
-- Initial schema: Voice-to-PRD project system
-- ============================================================

-- 1. Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  vision TEXT DEFAULT '',
  problem_statement TEXT,
  target_user TEXT DEFAULT '',
  user_stories JSONB DEFAULT '[]'::jsonb,
  core_features TEXT DEFAULT '',
  tech_stack TEXT DEFAULT '',
  architecture TEXT DEFAULT '',
  success_metrics TEXT DEFAULT '',
  risks_and_open_questions TEXT DEFAULT '',
  first_sprint_plan TEXT DEFAULT '',
  score_complexity INTEGER DEFAULT 5,
  score_impact INTEGER DEFAULT 5,
  score_urgency INTEGER DEFAULT 5,
  score_confidence INTEGER DEFAULT 5,
  transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view projects"
ON public.projects FOR SELECT USING (true);

CREATE POLICY "Anyone can create projects"
ON public.projects FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update projects"
ON public.projects FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete projects"
ON public.projects FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_projects_updated_at();

-- 2. Document chunks table
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view document chunks"
ON public.document_chunks FOR SELECT USING (true);

CREATE POLICY "Anyone can insert document chunks"
ON public.document_chunks FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update document chunks"
ON public.document_chunks FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete document chunks"
ON public.document_chunks FOR DELETE USING (true);

CREATE INDEX idx_document_chunks_text_search
ON public.document_chunks USING GIN (to_tsvector('english', chunk_text));

CREATE INDEX idx_document_chunks_keywords
ON public.document_chunks USING GIN (keywords);

CREATE INDEX idx_document_chunks_session_id
ON public.document_chunks (session_id);

CREATE INDEX idx_document_chunks_project_id
ON public.document_chunks (project_id);

-- 3. Project documents table
CREATE TABLE public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view project documents"
ON public.project_documents FOR SELECT USING (true);

CREATE POLICY "Anyone can insert project documents"
ON public.project_documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update project documents"
ON public.project_documents FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete project documents"
ON public.project_documents FOR DELETE USING (true);

CREATE INDEX idx_project_documents_project_id
ON public.project_documents (project_id);
