-- Trigger PostgREST schema cache reload
-- This is needed because new tables aren't visible to the REST API until reloaded
NOTIFY pgrst, 'reload schema';
