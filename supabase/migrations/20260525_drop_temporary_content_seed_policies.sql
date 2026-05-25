drop policy if exists "TEMP anon seed chapters" on public.chapters;
drop policy if exists "TEMP anon seed chapter_tasks" on public.chapter_tasks;
drop policy if exists "TEMP anon seed mcq_questions" on public.mcq_questions;
drop policy if exists "TEMP anon seed pengayaan_prompts" on public.pengayaan_prompts;

revoke insert, update, delete on public.chapters from anon;
revoke insert, update, delete on public.chapter_tasks from anon;
revoke insert, update, delete on public.mcq_questions from anon;
revoke insert, update, delete on public.pengayaan_prompts from anon;
