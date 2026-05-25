grant select, insert, update, delete on public.chapters to anon;
grant select, insert, update, delete on public.chapter_tasks to anon;
grant select, insert, update, delete on public.mcq_questions to anon;
grant select, insert, update, delete on public.pengayaan_prompts to anon;

create policy "TEMP anon seed chapters" on public.chapters for all to anon using (true) with check (true);
create policy "TEMP anon seed chapter_tasks" on public.chapter_tasks for all to anon using (true) with check (true);
create policy "TEMP anon seed mcq_questions" on public.mcq_questions for all to anon using (true) with check (true);
create policy "TEMP anon seed pengayaan_prompts" on public.pengayaan_prompts for all to anon using (true) with check (true);
