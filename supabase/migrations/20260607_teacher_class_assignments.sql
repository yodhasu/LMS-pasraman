-- LMS Pasraman — Teacher ↔ Class assignments
-- 2026-06-07: Junction table for which teachers teach which classes
-- Chapters remain GLOBAL; this table replaces class_chapters junction

create table if not exists public.teacher_class_assignments (
  teacher_id uuid not null references public.app_users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (teacher_id, class_id)
);

alter table public.teacher_class_assignments enable row level security;

-- Teachers can read their own assignments; admin all
create policy "tca_select" on public.teacher_class_assignments
  for select to authenticated
  using (
    teacher_id = auth.uid()
    or public.is_teacher_or_admin()
  );

-- Admin/teacher can insert their own
create policy "tca_insert" on public.teacher_class_assignments
  for insert to authenticated
  with check (public.is_teacher_or_admin());

-- Admin/teacher can delete
create policy "tca_delete" on public.teacher_class_assignments
  for delete to authenticated
  using (public.is_teacher_or_admin());

create index if not exists idx_tca_teacher on public.teacher_class_assignments(teacher_id);
create index if not exists idx_tca_class on public.teacher_class_assignments(class_id);

-- Seed: assign guru001 to both classes
insert into public.teacher_class_assignments (teacher_id, class_id)
select au.id, c.id
from public.app_users au, public.classes c
where au.username = 'guru001'
  and c.name in ('Kelas 1', 'Kelas 2')
  and not exists (
    select 1 from public.teacher_class_assignments tca
    where tca.teacher_id = au.id and tca.class_id = c.id
  );

notify pgrst, 'reload schema';
