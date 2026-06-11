-- LMS Pasraman — Add file upload columns for Phase 1 (Gdrive integration prep)
-- This migration adds the schema for file uploads to tasks, pengayaan, and materials.
-- Actual Gdrive integration comes in Phase 2; this just prepares the schema + stubs.

-- ═══════════════════════════════════════════
-- 1. chapter_tasks — add submission_type
-- ═══════════════════════════════════════════
alter table if exists public.chapter_tasks
  add column if not exists submission_type text not null default 'mcq';

do $$ begin
  alter table public.chapter_tasks
    add constraint chapter_tasks_submission_type_check
      check (submission_type in ('mcq', 'text', 'file'));
exception when duplicate_object then null;
end $$;

-- ═══════════════════════════════════════════
-- 2. task_submissions — add file fields
-- ═══════════════════════════════════════════
alter table if exists public.task_submissions
  add column if not exists file_url text,
  add column if not exists file_name text,
  add column if not exists file_size bigint;

-- ═══════════════════════════════════════════
-- 3. pengayaan_submissions — add file fields
-- ═══════════════════════════════════════════
alter table if exists public.pengayaan_submissions
  add column if not exists file_url text,
  add column if not exists file_name text,
  add column if not exists file_size bigint;

-- ═══════════════════════════════════════════
-- 4. chapter_materials — add file fields
-- ═══════════════════════════════════════════
alter table if exists public.chapter_materials
  add column if not exists file_url text,
  add column if not exists file_name text,
  add column if not exists file_size bigint;

-- Expand type check to include 'file' type for direct file materials
alter table if exists public.chapter_materials
  drop constraint if exists chapter_materials_type_check;

alter table if exists public.chapter_materials
  add constraint chapter_materials_type_check
    check (type in ('text', 'image', 'video', 'embed', 'file'));

-- Refresh schema cache
notify pgrst, 'reload schema';
