-- Audit C2 (Satori): seven knowledge/PRD tables had all-true policies for PUBLIC and full anon/authenticated grants.
--
-- DEPLOY ORDER (mandatory): (1) knowledge-bridge routes with session auth AND idealist-prd edge functions with
-- authenticate() are deployed and verified; (2) SUPABASE_SERVICE_ROLE_KEY is confirmed set for knowledge-bridge
-- (the app silently fell back to the anon key when it was missing); (3) then apply this migration.
--
-- Resulting access model
--   kb_blocking_questions, kb_conversations, prd_document_chunks, prd_usage_logs  -> server-only (service_role); no client grants/policies
--   prd_projects, prd_sessions   -> authenticated + allowlisted Idealist GitHub user; own rows (user_id = auth.uid())
--                                   PLUS legacy null-owner rows (preserved for every allowlisted user until a tested ownership mapping exists)
--   prd_project_documents        -> SELECT only, through visibility of the owning prd_projects row; writes stay server-side
--   anon                         -> nothing
-- The allowlist is evaluated from the provider-issued GitHub identity (auth.identities), never user_metadata.
-- Safe to re-run.
begin;

create schema if not exists idealist_private;
revoke all on schema idealist_private from public, anon;
grant usage on schema idealist_private to authenticated;

create or replace function idealist_private.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
  select exists (
    select 1
    from auth.identities i
    join public.idealist_allowed_users a
      on lower(a.github_username) = lower(coalesce(i.identity_data->>'user_name', i.identity_data->>'preferred_username'))
    where i.user_id = (select auth.uid())
      and i.provider = 'github'
  );
$$;
revoke all on function idealist_private.is_allowed_user() from public, anon;
grant execute on function idealist_private.is_allowed_user() to authenticated;

-- drop the all-true policies by their audited names (and any other policy on these tables, to avoid permissive OR-ing)
do $drop$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('kb_blocking_questions','kb_conversations','prd_document_chunks','prd_project_documents','prd_projects','prd_sessions','prd_usage_logs')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end
$drop$;

alter table public.kb_blocking_questions enable row level security;
alter table public.kb_conversations     enable row level security;
alter table public.prd_document_chunks   enable row level security;
alter table public.prd_project_documents enable row level security;
alter table public.prd_projects          enable row level security;
alter table public.prd_sessions          enable row level security;
alter table public.prd_usage_logs        enable row level security;

revoke all on table public.kb_blocking_questions, public.kb_conversations, public.prd_document_chunks,
  public.prd_project_documents, public.prd_projects, public.prd_sessions, public.prd_usage_logs from anon;
revoke all on table public.kb_blocking_questions, public.kb_conversations, public.prd_document_chunks,
  public.prd_usage_logs from authenticated;
revoke all on table public.prd_project_documents, public.prd_projects, public.prd_sessions from authenticated;
grant select, insert, update, delete on table public.prd_projects, public.prd_sessions to authenticated;
grant select on table public.prd_project_documents to authenticated;

-- prd_projects ---------------------------------------------------------------------------------
create policy prd_projects_select on public.prd_projects for select to authenticated
  using ((select idealist_private.is_allowed_user()) and (user_id = (select auth.uid()) or user_id is null));
create policy prd_projects_insert on public.prd_projects for insert to authenticated
  with check ((select idealist_private.is_allowed_user()) and (user_id = (select auth.uid()) or user_id is null));
create policy prd_projects_update on public.prd_projects for update to authenticated
  using ((select idealist_private.is_allowed_user()) and (user_id = (select auth.uid()) or user_id is null))
  with check ((select idealist_private.is_allowed_user()) and (user_id = (select auth.uid()) or user_id is null));
create policy prd_projects_delete on public.prd_projects for delete to authenticated
  using ((select idealist_private.is_allowed_user()) and (user_id = (select auth.uid()) or user_id is null));

-- prd_sessions ---------------------------------------------------------------------------------
create policy prd_sessions_select on public.prd_sessions for select to authenticated
  using ((select idealist_private.is_allowed_user()) and (user_id = (select auth.uid()) or user_id is null));
create policy prd_sessions_insert on public.prd_sessions for insert to authenticated
  with check ((select idealist_private.is_allowed_user()) and (user_id = (select auth.uid()) or user_id is null));
create policy prd_sessions_update on public.prd_sessions for update to authenticated
  using ((select idealist_private.is_allowed_user()) and (user_id = (select auth.uid()) or user_id is null))
  with check ((select idealist_private.is_allowed_user()) and (user_id = (select auth.uid()) or user_id is null));
create policy prd_sessions_delete on public.prd_sessions for delete to authenticated
  using ((select idealist_private.is_allowed_user()) and (user_id = (select auth.uid()) or user_id is null));

-- prd_project_documents: read through project visibility (RLS of prd_projects applies to the subquery) ----
create policy prd_project_documents_select on public.prd_project_documents for select to authenticated
  using ((select idealist_private.is_allowed_user())
         and exists (select 1 from public.prd_projects p where p.id = prd_project_documents.project_id));

-- expose nothing new through PostgREST for the private schema (not in db_schemas); keep search_path pinned on helper above.
notify pgrst, 'reload schema';
commit;
