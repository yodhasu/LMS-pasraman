-- LMS Pasraman — Teacher Batch CRUD
-- 2026-06-03: Single-call batch save + delete for teacher editing
-- Replaces individual per-field API calls with atomic batch operations

-- ═══════════════════════════════════════════
-- 1. save_chapter_batch — atomic batch save
-- ═══════════════════════════════════════════
create or replace function public.save_chapter_batch(
  p_chapter_id text,
  p_metadata jsonb,
  p_pengayaan jsonb,     -- {instruction: text | null, enabled: boolean}
  p_materials jsonb,     -- [{id, section_order, type, content, caption}]
  p_tasks jsonb,         -- [{id, title, description, due_date, task_order, questions: [{id, question_order, question, options, correct_index}]}]
  p_pretest jsonb,       -- [{id, question_order, question, options, correct_index}]
  p_posttest jsonb       -- [{id, question_order, question, options, correct_index}]
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_item jsonb;
  v_task jsonb;
  v_question jsonb;
begin
  if not public.is_teacher_or_admin() then
    raise exception 'Only teachers can save chapter data';
  end if;

  -- 1. Update chapter metadata
  update public.chapters
  set
    title = coalesce(p_metadata->>'title', title),
    subtitle = coalesce(p_metadata->>'subtitle', subtitle),
    description = coalesce(p_metadata->>'description', description),
    cover_emoji = coalesce(p_metadata->>'cover_emoji', cover_emoji),
    cover_color = coalesce(p_metadata->>'cover_color', cover_color),
    updated_at = now()
  where id = p_chapter_id;

  -- 2. Handle pengayaan
  delete from public.pengayaan_prompts where chapter_id = p_chapter_id;
  if (p_pengayaan->>'enabled')::boolean and p_pengayaan->>'instruction' is not null
     and length(trim(p_pengayaan->>'instruction')) > 0 then
    insert into public.pengayaan_prompts (chapter_id, instruction)
    values (p_chapter_id, p_pengayaan->>'instruction');
  end if;

  -- 3. Materials — delete all, reinsert
  delete from public.chapter_materials where chapter_id = p_chapter_id
    and id not in (select value->>'id' from jsonb_array_elements(p_materials) where value->>'id' is not null);
  
  if jsonb_array_length(p_materials) > 0 then
    for v_item in select * from jsonb_array_elements(p_materials)
    loop
      insert into public.chapter_materials (id, chapter_id, section_order, type, content, caption)
      values (
        (coalesce(v_item->>'id', gen_random_uuid()::text))::uuid,
        p_chapter_id,
        (v_item->>'section_order')::int,
        v_item->>'type',
        v_item->>'content',
        nullif(v_item->>'caption', '')
      )
      on conflict (id) do update set
        section_order = (v_item->>'section_order')::int,
        type = v_item->>'type',
        content = v_item->>'content',
        caption = nullif(v_item->>'caption', '');
    end loop;
  end if;

  -- 4. Tasks + questions — delete all, reinsert
  delete from public.chapter_tasks where chapter_id = p_chapter_id;
  
  if jsonb_array_length(p_tasks) > 0 then
    for v_task in select * from jsonb_array_elements(p_tasks)
    loop
      insert into public.chapter_tasks (id, chapter_id, title, description, due_date, task_order)
      values (
        v_task->>'id',
        p_chapter_id,
        v_task->>'title',
        v_task->>'description',
        nullif(v_task->>'due_date', '')::date,
        (v_task->>'task_order')::int
      );
      
      if v_task ? 'questions' and jsonb_array_length(v_task->'questions') > 0 then
        for v_question in select * from jsonb_array_elements(v_task->'questions')
        loop
          insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index)
          values (
            v_question->>'id',
            p_chapter_id,
            v_task->>'id',
            'tugas',
            (v_question->>'question_order')::int,
            v_question->>'question',
            v_question->'options',
            (v_question->>'correct_index')::int
          );
        end loop;
      end if;
    end loop;
  end if;

  -- 5. Pretest — delete all, reinsert (also delete orphaned user scores)
  delete from public.mcq_questions where chapter_id = p_chapter_id and assessment = 'pretest';
  delete from public.scores where chapter_id = p_chapter_id and type = 'pretest';
  
  if jsonb_array_length(p_pretest) > 0 then
    for v_question in select * from jsonb_array_elements(p_pretest)
    loop
      insert into public.mcq_questions (id, chapter_id, assessment, question_order, question, options, correct_index)
      values (
        v_question->>'id',
        p_chapter_id,
        'pretest',
        (v_question->>'question_order')::int,
        v_question->>'question',
        v_question->'options',
        (v_question->>'correct_index')::int
      );
    end loop;
  end if;

  -- 6. Posttest — delete all, reinsert
  delete from public.mcq_questions where chapter_id = p_chapter_id and assessment = 'posttest';
  delete from public.scores where chapter_id = p_chapter_id and type = 'posttest';
  
  if jsonb_array_length(p_posttest) > 0 then
    for v_question in select * from jsonb_array_elements(p_posttest)
    loop
      insert into public.mcq_questions (id, chapter_id, assessment, question_order, question, options, correct_index)
      values (
        v_question->>'id',
        p_chapter_id,
        'posttest',
        (v_question->>'question_order')::int,
        v_question->>'question',
        v_question->'options',
        (v_question->>'correct_index')::int
      );
    end loop;
  end if;

  -- Reset chapter progress since content changed
  delete from public.chapter_progress where chapter_id = p_chapter_id;
  delete from public.material_progress where material_id in (select id from public.chapter_materials where chapter_id = p_chapter_id);

  return jsonb_build_object('ok', true, 'message', 'Bab berhasil disimpan');
end;
$$;

revoke execute on function public.save_chapter_batch(
  p_chapter_id text, p_metadata jsonb, p_pengayaan jsonb,
  p_materials jsonb, p_tasks jsonb, p_pretest jsonb, p_posttest jsonb
) from public;
grant execute on function public.save_chapter_batch(
  p_chapter_id text, p_metadata jsonb, p_pengayaan jsonb,
  p_materials jsonb, p_tasks jsonb, p_pretest jsonb, p_posttest jsonb
) to authenticated;

-- ═══════════════════════════════════════════
-- 2. delete_chapter — cascade delete
-- ═══════════════════════════════════════════
create or replace function public.delete_chapter(
  p_chapter_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_teacher_or_admin() then
    raise exception 'Only teachers can delete chapters';
  end if;

  delete from public.pengayaan_submissions where chapter_id = p_chapter_id;
  delete from public.task_submissions where task_id in (select id from public.chapter_tasks where chapter_id = p_chapter_id);
  delete from public.material_progress where material_id in (select id from public.chapter_materials where chapter_id = p_chapter_id);
  delete from public.scores where chapter_id = p_chapter_id;
  delete from public.chapter_progress where chapter_id = p_chapter_id;
  delete from public.pengayaan_prompts where chapter_id = p_chapter_id;
  delete from public.mcq_questions where chapter_id = p_chapter_id;
  delete from public.chapter_tasks where chapter_id = p_chapter_id;
  delete from public.chapter_materials where chapter_id = p_chapter_id;
  delete from public.task_submissions where task_id in (select id from public.chapter_tasks where chapter_id = p_chapter_id);
  delete from public.chapters where id = p_chapter_id;

  return jsonb_build_object('ok', true, 'message', 'Bab berhasil dihapus');
end;
$$;

revoke execute on function public.delete_chapter(text) from public;
grant execute on function public.delete_chapter(text) to authenticated;

-- Refresh schema cache
notify pgrst, 'reload schema';
