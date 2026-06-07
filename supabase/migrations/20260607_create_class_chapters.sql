-- LMS Pasraman — Bind chapters to classes via class_chapters junction
-- 2026-06-07: Each class has its own set of visible chapters

-- ═══════════════════════════════════════════
-- 1. Create class_chapters junction table
-- ═══════════════════════════════════════════
create table if not exists public.class_chapters (
  id uuid default gen_random_uuid() primary key,
  class_id uuid not null references public.classes(id) on delete cascade,
  chapter_id text not null references public.chapters(id) on delete cascade,
  order_index integer not null default 0,
  unique(class_id, chapter_id)
);

alter table public.class_chapters enable row level security;

-- ═══════════════════════════════════════════
-- 2. RLS: teacher/admin can manage, students can read their own class
-- ═══════════════════════════════════════════
create policy "class_chapters_read" on public.class_chapters
  for select
  to authenticated
  using (true);

create policy "class_chapters_write" on public.class_chapters
  for insert
  to authenticated
  with check (public.is_teacher_or_admin());

create policy "class_chapters_update" on public.class_chapters
  for update
  to authenticated
  using (public.is_teacher_or_admin());

create policy "class_chapters_delete" on public.class_chapters
  for delete
  to authenticated
  using (public.is_teacher_or_admin());

-- ═══════════════════════════════════════════
-- 3. Indexes
-- ═══════════════════════════════════════════
create index if not exists idx_class_chapters_class on public.class_chapters(class_id);
create index if not exists idx_class_chapters_chapter on public.class_chapters(chapter_id);

-- ═══════════════════════════════════════════
-- 4. Seed: bind all 6 bab to Kelas 1 and Kelas 2
-- ═══════════════════════════════════════════
insert into public.class_chapters (class_id, chapter_id, order_index)
select c.id, ch.id, ch.order_index
from public.classes c
cross join public.chapters ch
where c.name in ('Kelas 1', 'Kelas 2')
  and not exists (
    select 1 from public.class_chapters cc
    where cc.class_id = c.id and cc.chapter_id = ch.id
  )
order by c.name, ch.order_index;

-- ═══════════════════════════════════════════
-- 5. Notify
-- ═══════════════════════════════════════════
notify pgrst, 'reload schema';
