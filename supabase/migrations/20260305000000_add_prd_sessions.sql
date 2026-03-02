-- Session persistence for pause/resume
CREATE TABLE IF NOT EXISTS prd_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  messages JSONB DEFAULT '[]',
  transcript TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  project_id UUID REFERENCES prd_projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_prd_sessions_status ON prd_sessions (status, updated_at DESC);
CREATE INDEX idx_prd_sessions_project ON prd_sessions (project_id) WHERE project_id IS NOT NULL;

-- RLS: open access
ALTER TABLE prd_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sessions" ON prd_sessions FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_prd_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prd_sessions_updated_at
  BEFORE UPDATE ON prd_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_prd_sessions_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE prd_sessions;
ALTER TABLE prd_sessions REPLICA IDENTITY FULL;
