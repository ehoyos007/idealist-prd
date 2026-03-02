-- Fix realtime replication for prd_projects
-- Set REPLICA IDENTITY FULL so DELETE events include the full old row
-- and re-add to publication in case the initial migration didn't apply

ALTER TABLE public.prd_projects REPLICA IDENTITY FULL;

-- Re-add to publication (idempotent — will no-op if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'prd_projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prd_projects;
  END IF;
END $$;
