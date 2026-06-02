-- LMS Pasraman — chapter_materials RLS policies
-- Teacher CRUD for managing learning materials

-- 1. Table creation (idempotent, in case it was made manually in dashboard)
create table if not exists public.chapter_materials (
  id text primary key,
  chapter_id text not null references public.chapters(id) on delete cascade,
  section_order integer not null default 0,
  type text not null check (type in ('text', 'image', 'video', 'embed')),
  content text not null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chapter_materials_chapter_order_idx
  on public.chapter_materials(chapter_id, section_order);

-- 2. Enable RLS
alter table public.chapter_materials enable row level security;

-- 3. Policies
drop policy if exists "chapter_materials: select for authenticated" on public.chapter_materials;
create policy "chapter_materials: select for authenticated"
  on public.chapter_materials for select
  to authenticated
  using (true);

drop policy if exists "chapter_materials: insert for teacher/admin" on public.chapter_materials;
create policy "chapter_materials: insert for teacher/admin"
  on public.chapter_materials for insert
  to authenticated
  with check (public.is_teacher_or_admin());

drop policy if exists "chapter_materials: update for teacher/admin" on public.chapter_materials;
create policy "chapter_materials: update for teacher/admin"
  on public.chapter_materials for update
  to authenticated
  using (public.is_teacher_or_admin())
  with check (public.is_teacher_or_admin());

drop policy if exists "chapter_materials: delete for teacher/admin" on public.chapter_materials;
create policy "chapter_materials: delete for teacher/admin"
  on public.chapter_materials for delete
  to authenticated
  using (public.is_teacher_or_admin());

-- 4. Also handle material_progress table (same situation — may have been created manually)
create table if not exists public.material_progress (
  user_id text not null references public.app_users(id) on delete cascade,
  material_id text not null references public.chapter_materials(id) on delete cascade,
  viewed boolean not null default false,
  viewed_at timestamptz,
  primary key (user_id, material_id)
);

alter table public.material_progress enable row level security;

drop policy if exists "material_progress: select own or teacher/all" on public.material_progress;
create policy "material_progress: select own or teacher/all"
  on public.material_progress for select
  to authenticated
  using (
    user_id = auth.uid()::text
    or public.is_teacher_or_admin()
  );

drop policy if exists "material_progress: insert own" on public.material_progress;
create policy "material_progress: insert own"
  on public.material_progress for insert
  to authenticated
  with check (user_id = auth.uid()::text);

drop policy if exists "material_progress: update own" on public.material_progress;
create policy "material_progress: update own"
  on public.material_progress for update
  to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);
