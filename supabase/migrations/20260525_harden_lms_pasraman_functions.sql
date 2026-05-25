create or replace function public.current_firebase_uid()
returns text
language sql
stable
set search_path = public
as $$
  select nullif(auth.jwt()->>'sub', '')
$$;

create or replace function public.is_teacher_or_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('teacher', 'admin'), false)
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.current_app_role() from anon, authenticated;
revoke execute on function public.current_app_role() from public;

-- Pre-existing helper detected by Supabase advisor; not needed as public RPC.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from anon, authenticated;
    revoke execute on function public.rls_auto_enable() from public;
  end if;
end $$;

create index if not exists chapter_progress_chapter_id_idx on public.chapter_progress(chapter_id);
create index if not exists chapter_tasks_chapter_id_idx on public.chapter_tasks(chapter_id);
create index if not exists scores_chapter_id_idx on public.scores(chapter_id);
