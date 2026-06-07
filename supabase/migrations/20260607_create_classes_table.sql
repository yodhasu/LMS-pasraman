-- LMS Pasraman — Create classes table
-- 2026-06-07: Add proper class system replacing flat class_name/semester fields
-- Phase 1 of class system implementation

-- ═══════════════════════════════════════════
-- 1. Create classes table
-- ═══════════════════════════════════════════
create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text default '',
  teacher_id uuid references public.app_users(id) on delete set null,
  semester text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══════════════════════════════════════════
-- 2. Add class_id to app_users (migrate from flat class_name)
-- ═══════════════════════════════════════════
alter table public.app_users
  add column if not exists class_id uuid references public.classes(id) on delete set null;

-- ═══════════════════════════════════════════
-- 3. RLS
-- ═══════════════════════════════════════════
alter table public.classes enable row level security;

-- Teachers see their own classes; admin sees all
create policy "classes_teacher_select" on public.classes
  for select
  to authenticated
  using (
    teacher_id = auth.uid()
    or public.is_teacher_or_admin()
  );

-- Teachers can insert classes as their own
create policy "classes_teacher_insert" on public.classes
  for insert
  to authenticated
  with check (
    (teacher_id = auth.uid() and public.is_teacher_or_admin())
    or exists (select 1 from public.app_users where id = auth.uid() and role = 'admin')
  );

-- Teachers can update their own classes; admin all
create policy "classes_teacher_update" on public.classes
  for update
  to authenticated
  using (
    teacher_id = auth.uid()
    or exists (select 1 from public.app_users where id = auth.uid() and role = 'admin')
  );

-- Teachers can delete their own classes; admin all
create policy "classes_teacher_delete" on public.classes
  for delete
  to authenticated
  using (
    teacher_id = auth.uid()
    or exists (select 1 from public.app_users where id = auth.uid() and role = 'admin')
  );

-- ═══════════════════════════════════════════
-- 4. Index for performance
-- ═══════════════════════════════════════════
create index if not exists idx_classes_teacher_id on public.classes(teacher_id);
create index if not exists idx_app_users_class_id on public.app_users(class_id);

-- ═══════════════════════════════════════════
-- 5. Schema cache
-- ═══════════════════════════════════════════
notify pgrst, 'reload schema';
