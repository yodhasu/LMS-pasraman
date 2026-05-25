-- LMS Pasraman initial Supabase schema
-- Firebase Auth remains the identity provider.
-- Supabase receives Firebase ID tokens through supabase-js accessToken().

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- Types
-- ─────────────────────────────────────────────────────────────

do $$ begin
  create type public.app_role as enum ('student', 'teacher', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.assessment_type as enum ('pretest', 'posttest', 'tugas', 'pengayaan');
exception when duplicate_object then null;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Auth helper that does not depend on app tables
-- ─────────────────────────────────────────────────────────────

create or replace function public.current_firebase_uid()
returns text
language sql
stable
as $$
  select nullif(auth.jwt()->>'sub', '')
$$;

-- ─────────────────────────────────────────────────────────────
-- Core users
-- ─────────────────────────────────────────────────────────────

create table if not exists public.app_users (
  firebase_uid text primary key,
  email text unique not null,
  username text unique,
  display_name text,
  role public.app_role not null default 'student',
  class_name text,
  semester text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SECURITY DEFINER avoids recursive RLS checks when policies need the user's role.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.app_users
  where firebase_uid = public.current_firebase_uid()
  limit 1
$$;

create or replace function public.is_teacher_or_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_app_role() in ('teacher', 'admin'), false)
$$;

-- ─────────────────────────────────────────────────────────────
-- Learning content
-- ─────────────────────────────────────────────────────────────

create table if not exists public.chapters (
  id text primary key,
  order_index integer not null unique,
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  material_content text not null default '',
  material_video_url text,
  cover_emoji text not null default '📖',
  cover_color text not null default 'from-green-100 to-emerald-200',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapter_tasks (
  id text primary key,
  chapter_id text not null references public.chapters(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_date date,
  task_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mcq_questions (
  id text primary key,
  chapter_id text not null references public.chapters(id) on delete cascade,
  task_id text references public.chapter_tasks(id) on delete cascade,
  assessment public.assessment_type not null,
  question_order integer not null default 0,
  question text not null,
  options jsonb not null,
  correct_index integer not null,
  created_at timestamptz not null default now(),
  constraint mcq_options_array check (jsonb_typeof(options) = 'array'),
  constraint mcq_correct_index_non_negative check (correct_index >= 0),
  constraint mcq_task_assessment_shape check (
    (assessment = 'tugas' and task_id is not null)
    or
    (assessment in ('pretest', 'posttest') and task_id is null)
  )
);

create index if not exists mcq_questions_chapter_assessment_idx
  on public.mcq_questions(chapter_id, assessment, question_order);

create index if not exists mcq_questions_task_idx
  on public.mcq_questions(task_id, question_order);

create table if not exists public.pengayaan_prompts (
  chapter_id text primary key references public.chapters(id) on delete cascade,
  instruction text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Student state
-- ─────────────────────────────────────────────────────────────

create table if not exists public.chapter_progress (
  user_id text not null references public.app_users(firebase_uid) on delete cascade,
  chapter_id text not null references public.chapters(id) on delete cascade,
  pretest boolean not null default false,
  materi boolean not null default false,
  tugas boolean not null default false,
  posttest boolean not null default false,
  complete boolean generated always as (pretest and materi and tugas and posttest) stored,
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

create table if not exists public.scores (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id text not null references public.app_users(firebase_uid) on delete cascade,
  chapter_id text not null references public.chapters(id) on delete cascade,
  type public.assessment_type not null,
  score integer not null check (score >= 0 and score <= 100),
  submitted_at timestamptz not null default now(),
  unique (user_id, chapter_id, type)
);

create index if not exists scores_user_submitted_idx
  on public.scores(user_id, submitted_at desc);

create table if not exists public.task_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  task_id text not null references public.chapter_tasks(id) on delete cascade,
  user_id text not null references public.app_users(firebase_uid) on delete cascade,
  user_name text,
  answers jsonb not null default '{}'::jsonb,
  score integer check (score is null or (score >= 0 and score <= 100)),
  submitted_at timestamptz not null default now(),
  unique (task_id, user_id),
  constraint task_answers_object check (jsonb_typeof(answers) = 'object')
);

create index if not exists task_submissions_user_idx
  on public.task_submissions(user_id, submitted_at desc);

create table if not exists public.pengayaan_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  chapter_id text not null references public.chapters(id) on delete cascade,
  user_id text not null references public.app_users(firebase_uid) on delete cascade,
  user_name text,
  link text not null,
  submitted_at timestamptz not null default now(),
  unique (chapter_id, user_id)
);

create index if not exists pengayaan_submissions_user_idx
  on public.pengayaan_submissions(user_id, submitted_at desc);

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_app_users_updated_at on public.app_users;
create trigger set_app_users_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

drop trigger if exists set_chapters_updated_at on public.chapters;
create trigger set_chapters_updated_at
before update on public.chapters
for each row execute function public.set_updated_at();

drop trigger if exists set_chapter_tasks_updated_at on public.chapter_tasks;
create trigger set_chapter_tasks_updated_at
before update on public.chapter_tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_pengayaan_prompts_updated_at on public.pengayaan_prompts;
create trigger set_pengayaan_prompts_updated_at
before update on public.pengayaan_prompts
for each row execute function public.set_updated_at();

drop trigger if exists set_chapter_progress_updated_at on public.chapter_progress;
create trigger set_chapter_progress_updated_at
before update on public.chapter_progress
for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table public.app_users enable row level security;
alter table public.chapters enable row level security;
alter table public.chapter_tasks enable row level security;
alter table public.mcq_questions enable row level security;
alter table public.pengayaan_prompts enable row level security;
alter table public.chapter_progress enable row level security;
alter table public.scores enable row level security;
alter table public.task_submissions enable row level security;
alter table public.pengayaan_submissions enable row level security;

-- app_users
create policy "Users can read own profile or teachers can read all profiles"
  on public.app_users for select
  to authenticated
  using (firebase_uid = public.current_firebase_uid() or public.is_teacher_or_admin());

create policy "Users can insert own student profile"
  on public.app_users for insert
  to authenticated
  with check (firebase_uid = public.current_firebase_uid() and role = 'student');

create policy "Users can update own basic profile"
  on public.app_users for update
  to authenticated
  using (firebase_uid = public.current_firebase_uid())
  with check (firebase_uid = public.current_firebase_uid() and role = public.current_app_role());

create policy "Teachers can manage users"
  on public.app_users for all
  to authenticated
  using (public.is_teacher_or_admin())
  with check (public.is_teacher_or_admin());

-- Content is readable by signed-in users. Writes are teacher/admin only.
create policy "Authenticated users can read chapters"
  on public.chapters for select
  to authenticated
  using (true);

create policy "Teachers can manage chapters"
  on public.chapters for all
  to authenticated
  using (public.is_teacher_or_admin())
  with check (public.is_teacher_or_admin());

create policy "Authenticated users can read tasks"
  on public.chapter_tasks for select
  to authenticated
  using (true);

create policy "Teachers can manage tasks"
  on public.chapter_tasks for all
  to authenticated
  using (public.is_teacher_or_admin())
  with check (public.is_teacher_or_admin());

create policy "Authenticated users can read questions"
  on public.mcq_questions for select
  to authenticated
  using (true);

create policy "Teachers can manage questions"
  on public.mcq_questions for all
  to authenticated
  using (public.is_teacher_or_admin())
  with check (public.is_teacher_or_admin());

create policy "Authenticated users can read pengayaan prompts"
  on public.pengayaan_prompts for select
  to authenticated
  using (true);

create policy "Teachers can manage pengayaan prompts"
  on public.pengayaan_prompts for all
  to authenticated
  using (public.is_teacher_or_admin())
  with check (public.is_teacher_or_admin());

-- Progress: students manage own rows; teachers read/manage all.
create policy "Users can read own progress or teachers can read all progress"
  on public.chapter_progress for select
  to authenticated
  using (user_id = public.current_firebase_uid() or public.is_teacher_or_admin());

create policy "Users can insert own progress"
  on public.chapter_progress for insert
  to authenticated
  with check (user_id = public.current_firebase_uid() or public.is_teacher_or_admin());

create policy "Users can update own progress"
  on public.chapter_progress for update
  to authenticated
  using (user_id = public.current_firebase_uid() or public.is_teacher_or_admin())
  with check (user_id = public.current_firebase_uid() or public.is_teacher_or_admin());

-- Scores/submissions: students manage own, teachers can review all.
create policy "Users can read own scores or teachers can read all scores"
  on public.scores for select
  to authenticated
  using (user_id = public.current_firebase_uid() or public.is_teacher_or_admin());

create policy "Users can upsert own scores"
  on public.scores for insert
  to authenticated
  with check (user_id = public.current_firebase_uid() or public.is_teacher_or_admin());

create policy "Users can update own scores"
  on public.scores for update
  to authenticated
  using (user_id = public.current_firebase_uid() or public.is_teacher_or_admin())
  with check (user_id = public.current_firebase_uid() or public.is_teacher_or_admin());

create policy "Users can read own task submissions or teachers can read all"
  on public.task_submissions for select
  to authenticated
  using (user_id = public.current_firebase_uid() or public.is_teacher_or_admin());

create policy "Users can insert own task submissions"
  on public.task_submissions for insert
  to authenticated
  with check (user_id = public.current_firebase_uid() or public.is_teacher_or_admin());

create policy "Users can update own task submissions"
  on public.task_submissions for update
  to authenticated
  using (user_id = public.current_firebase_uid() or public.is_teacher_or_admin())
  with check (user_id = public.current_firebase_uid() or public.is_teacher_or_admin());

create policy "Users can read own pengayaan submissions or teachers can read all"
  on public.pengayaan_submissions for select
  to authenticated
  using (user_id = public.current_firebase_uid() or public.is_teacher_or_admin());

create policy "Users can insert own pengayaan submissions"
  on public.pengayaan_submissions for insert
  to authenticated
  with check (user_id = public.current_firebase_uid() or public.is_teacher_or_admin());

create policy "Users can update own pengayaan submissions"
  on public.pengayaan_submissions for update
  to authenticated
  using (user_id = public.current_firebase_uid() or public.is_teacher_or_admin())
  with check (user_id = public.current_firebase_uid() or public.is_teacher_or_admin());
