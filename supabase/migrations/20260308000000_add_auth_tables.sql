-- ============================================================
-- Auth tables: profiles, allowlist, user scoping, Supabase project links
-- ============================================================

-- 1. Allowed users whitelist (invite-only access)
CREATE TABLE public.idealist_allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_username TEXT NOT NULL UNIQUE,
  invited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE idealist_allowed_users ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (RLS blocks all client access)
CREATE POLICY "service_role_only" ON idealist_allowed_users
  FOR ALL USING (false) WITH CHECK (false);

-- Seed with initial allowed user
INSERT INTO idealist_allowed_users (github_username) VALUES ('enzohoyos');

-- 2. User profiles (linked to auth.users)
CREATE TABLE public.idealist_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL UNIQUE,
  github_avatar_url TEXT,
  display_name TEXT,
  github_access_token TEXT,
  supabase_management_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE idealist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile_select" ON idealist_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "own_profile_update" ON idealist_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "own_profile_insert" ON idealist_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_idealist_profiles_updated_at
  BEFORE UPDATE ON idealist_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prd_projects_updated_at();

-- 3. Add user_id to existing tables (nullable for backward compatibility)
ALTER TABLE public.prd_projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.prd_sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.prd_document_chunks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_prd_projects_user_id ON prd_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_prd_sessions_user_id ON prd_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prd_document_chunks_user_id ON prd_document_chunks(user_id);

-- 4. Supabase project links (repo <-> Supabase project mapping)
CREATE TABLE public.idealist_supabase_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_name TEXT NOT NULL,
  supabase_project_ref TEXT NOT NULL,
  supabase_project_name TEXT,
  auto_detected BOOLEAN DEFAULT false,
  schema_chunks_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, repo_name)
);

ALTER TABLE idealist_supabase_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_links" ON idealist_supabase_projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. RPC for project-scoped chunk retrieval
CREATE OR REPLACE FUNCTION public.match_document_chunks_by_project(
  query_embedding extensions.vector(1024),
  match_project_id uuid,
  match_threshold float DEFAULT 0.4,
  match_count int DEFAULT 5
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
    dc.id,
    dc.file_name,
    dc.chunk_index,
    dc.chunk_text,
    dc.keywords,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM prd_document_chunks dc
  WHERE dc.project_id = match_project_id
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
