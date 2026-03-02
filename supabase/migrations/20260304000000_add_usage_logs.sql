-- Usage/cost logging table for AI API calls
CREATE TABLE IF NOT EXISTS prd_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  model TEXT,
  provider TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost NUMERIC(10, 6),
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying by function and time
CREATE INDEX idx_usage_logs_function ON prd_usage_logs (function_name, created_at DESC);
CREATE INDEX idx_usage_logs_session ON prd_usage_logs (session_id) WHERE session_id IS NOT NULL;

-- RLS: open access (no auth in this app)
ALTER TABLE prd_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to usage_logs" ON prd_usage_logs FOR ALL USING (true) WITH CHECK (true);
