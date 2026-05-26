-- Add DELETE policies so users can reset their own progress
-- Applied via Supabase MCP on 2026-05-26

create policy "Users can delete own progress"
  on public.chapter_progress for delete
  to authenticated
  using (user_id = auth.uid() or is_teacher_or_admin());

create policy "Users can delete own scores"
  on public.scores for delete
  to authenticated
  using (user_id = auth.uid() or is_teacher_or_admin());

create policy "Users can delete own task submissions"
  on public.task_submissions for delete
  to authenticated
  using (user_id = auth.uid() or is_teacher_or_admin());

create policy "Users can delete own pengayaan submissions"
  on public.pengayaan_submissions for delete
  to authenticated
  using (user_id = auth.uid() or is_teacher_or_admin());

create policy "Users can delete own material_progress"
  on public.material_progress for delete
  to authenticated
  using (user_id = auth.uid() or is_teacher_or_admin());
