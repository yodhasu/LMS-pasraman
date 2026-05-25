-- Full LMS Pasraman migration from Firebase UID ownership to Supabase Auth UUID ownership.
-- Applied in Supabase production via MCP on 2026-05-25.

-- Drop old Firebase-oriented policies before changing columns.
drop policy if exists "Users can read own profile or teachers can read all profiles" on public.app_users;
drop policy if exists "Users can insert own student profile" on public.app_users;
drop policy if exists "Users can update own basic profile" on public.app_users;
drop policy if exists "Teachers can manage users" on public.app_users;
drop policy if exists "Authenticated users can read chapters" on public.chapters;
drop policy if exists "Teachers can manage chapters" on public.chapters;
drop policy if exists "Authenticated users can read tasks" on public.chapter_tasks;
drop policy if exists "Teachers can manage tasks" on public.chapter_tasks;
drop policy if exists "Authenticated users can read questions" on public.mcq_questions;
drop policy if exists "Teachers can manage questions" on public.mcq_questions;
drop policy if exists "Authenticated users can read pengayaan prompts" on public.pengayaan_prompts;
drop policy if exists "Teachers can manage pengayaan prompts" on public.pengayaan_prompts;
drop policy if exists "Users can read own progress or teachers can read all progress" on public.chapter_progress;
drop policy if exists "Users can insert own progress" on public.chapter_progress;
drop policy if exists "Users can update own progress" on public.chapter_progress;
drop policy if exists "Users can read own scores or teachers can read all scores" on public.scores;
drop policy if exists "Users can upsert own scores" on public.scores;
drop policy if exists "Users can update own scores" on public.scores;
drop policy if exists "Users can read own task submissions or teachers can read all" on public.task_submissions;
drop policy if exists "Users can insert own task submissions" on public.task_submissions;
drop policy if exists "Users can update own task submissions" on public.task_submissions;
drop policy if exists "Users can read own pengayaan submissions or teachers can read all" on public.pengayaan_submissions;
drop policy if exists "Users can insert own pengayaan submissions" on public.pengayaan_submissions;
drop policy if exists "Users can update own pengayaan submissions" on public.pengayaan_submissions;

alter table public.chapter_progress drop constraint if exists chapter_progress_user_id_fkey;
alter table public.scores drop constraint if exists scores_user_id_fkey;
alter table public.task_submissions drop constraint if exists task_submissions_user_id_fkey;
alter table public.pengayaan_submissions drop constraint if exists pengayaan_submissions_user_id_fkey;

alter table public.app_users drop constraint if exists app_users_pkey;
alter table public.app_users drop column if exists firebase_uid;
alter table public.app_users add column if not exists id uuid;
update public.app_users set id = gen_random_uuid() where id is null;
alter table public.app_users alter column id set not null;
alter table public.app_users add constraint app_users_pkey primary key (id);
alter table public.app_users add constraint app_users_id_fkey foreign key (id) references auth.users(id) on delete cascade;

alter table public.chapter_progress alter column user_id type uuid using null;
alter table public.scores alter column user_id type uuid using null;
alter table public.task_submissions alter column user_id type uuid using null;
alter table public.pengayaan_submissions alter column user_id type uuid using null;

alter table public.chapter_progress add constraint chapter_progress_user_id_fkey foreign key (user_id) references public.app_users(id) on delete cascade;
alter table public.scores add constraint scores_user_id_fkey foreign key (user_id) references public.app_users(id) on delete cascade;
alter table public.task_submissions add constraint task_submissions_user_id_fkey foreign key (user_id) references public.app_users(id) on delete cascade;
alter table public.pengayaan_submissions add constraint pengayaan_submissions_user_id_fkey foreign key (user_id) references public.app_users(id) on delete cascade;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.app_users where id = auth.uid() limit 1
$$;

create or replace function public.is_teacher_or_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('teacher', 'admin'), false)
$$;

-- Lesson content is public-readable; student state remains authenticated/RLS-owned.
create policy "Anyone can read chapters" on public.chapters for select to anon, authenticated using (true);
create policy "Teachers can manage chapters" on public.chapters for all to authenticated using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());
create policy "Anyone can read tasks" on public.chapter_tasks for select to anon, authenticated using (true);
create policy "Teachers can manage tasks" on public.chapter_tasks for all to authenticated using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());
create policy "Anyone can read questions" on public.mcq_questions for select to anon, authenticated using (true);
create policy "Teachers can manage questions" on public.mcq_questions for all to authenticated using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());
create policy "Anyone can read pengayaan prompts" on public.pengayaan_prompts for select to anon, authenticated using (true);
create policy "Teachers can manage pengayaan prompts" on public.pengayaan_prompts for all to authenticated using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());

create policy "Users can read own profile or teachers can read all profiles" on public.app_users for select to authenticated using (id = auth.uid() or public.is_teacher_or_admin());
create policy "Users can insert own student profile" on public.app_users for insert to authenticated with check (id = auth.uid() and role = 'student');
create policy "Users can update own basic profile" on public.app_users for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = public.current_app_role());
create policy "Teachers can manage users" on public.app_users for all to authenticated using (public.is_teacher_or_admin()) with check (public.is_teacher_or_admin());

create policy "Users can read own progress or teachers can read all progress" on public.chapter_progress for select to authenticated using (user_id = auth.uid() or public.is_teacher_or_admin());
create policy "Users can insert own progress" on public.chapter_progress for insert to authenticated with check (user_id = auth.uid() or public.is_teacher_or_admin());
create policy "Users can update own progress" on public.chapter_progress for update to authenticated using (user_id = auth.uid() or public.is_teacher_or_admin()) with check (user_id = auth.uid() or public.is_teacher_or_admin());
create policy "Users can read own scores or teachers can read all scores" on public.scores for select to authenticated using (user_id = auth.uid() or public.is_teacher_or_admin());
create policy "Users can insert own scores" on public.scores for insert to authenticated with check (user_id = auth.uid() or public.is_teacher_or_admin());
create policy "Users can update own scores" on public.scores for update to authenticated using (user_id = auth.uid() or public.is_teacher_or_admin()) with check (user_id = auth.uid() or public.is_teacher_or_admin());
create policy "Users can read own task submissions or teachers can read all" on public.task_submissions for select to authenticated using (user_id = auth.uid() or public.is_teacher_or_admin());
create policy "Users can insert own task submissions" on public.task_submissions for insert to authenticated with check (user_id = auth.uid() or public.is_teacher_or_admin());
create policy "Users can update own task submissions" on public.task_submissions for update to authenticated using (user_id = auth.uid() or public.is_teacher_or_admin()) with check (user_id = auth.uid() or public.is_teacher_or_admin());
create policy "Users can read own pengayaan submissions or teachers can read all" on public.pengayaan_submissions for select to authenticated using (user_id = auth.uid() or public.is_teacher_or_admin());
create policy "Users can insert own pengayaan submissions" on public.pengayaan_submissions for insert to authenticated with check (user_id = auth.uid() or public.is_teacher_or_admin());
create policy "Users can update own pengayaan submissions" on public.pengayaan_submissions for update to authenticated using (user_id = auth.uid() or public.is_teacher_or_admin()) with check (user_id = auth.uid() or public.is_teacher_or_admin());

-- Seed local LMS accounts in Supabase Auth. Password: pasraman123.
do $$
declare
  account record;
  user_id uuid;
begin
  for account in
    select * from (values
      ('siswa001@pasraman.id', 'siswa001', 'Siswa Budi', 'student'::public.app_role),
      ('guru001@pasraman.id', 'guru001', 'Guru Pasraman', 'teacher'::public.app_role),
      ('santri001@pasraman.id', 'santri001', 'Siswa Budi', 'student'::public.app_role)
    ) as accounts(email, username, display_name, app_role)
  loop
    select id into user_id from auth.users where email = account.email limit 1;
    if user_id is null then
      user_id := gen_random_uuid();
      insert into auth.users (
        id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change_token_new, email_change_token_current,
        recovery_token, reauthentication_token, is_sso_user, is_anonymous
      ) values (
        user_id, 'authenticated', 'authenticated', account.email,
        crypt('pasraman123', gen_salt('bf')), now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('display_name', account.display_name, 'username', account.username),
        now(), now(), '', '', '', '', '', false, false
      );
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), user_id, user_id::text, jsonb_build_object('sub', user_id::text, 'email', account.email, 'email_verified', true), 'email', now(), now(), now());
    end if;

    insert into public.app_users (id, email, username, display_name, role)
    values (user_id, account.email, account.username, account.display_name, account.app_role)
    on conflict (id) do update set email = excluded.email, username = excluded.username, display_name = excluded.display_name, role = excluded.role;
  end loop;
end $$;

revoke execute on function public.current_app_role() from anon, authenticated;
revoke execute on function public.current_app_role() from public;
