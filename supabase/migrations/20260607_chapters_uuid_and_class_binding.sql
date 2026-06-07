-- LMS Pasraman — Migrate chapters to UUID PK + class_id binding
-- 2026-06-07: chapters.id → uuid uid, add class_id, update all FKs

-- ═══════════════════════════════════════════
-- 0. Drop order_index UNIQUE (will conflict across classes)
-- ═══════════════════════════════════════════
alter table public.chapters drop constraint if exists chapters_order_index_key;

-- ═══════════════════════════════════════════
-- 1. chapters: add uuid uid + class_id
-- ═══════════════════════════════════════════
alter table public.chapters add column uid uuid default gen_random_uuid();
update public.chapters set uid = gen_random_uuid() where uid is null;
alter table public.chapters alter column uid set not null;

alter table public.chapters add column class_id uuid references public.classes(id) on delete cascade;

create unique index idx_chapters_uid on public.chapters(uid);

-- ═══════════════════════════════════════════
-- 2. Child tables: add chapter_uid column
-- ═══════════════════════════════════════════
alter table public.chapter_materials add column chapter_uid uuid;
alter table public.chapter_progress add column chapter_uid uuid;
alter table public.chapter_tasks add column chapter_uid uuid;
alter table public.mcq_questions add column chapter_uid uuid;
alter table public.pengayaan_prompts add column chapter_uid uuid;
alter table public.pengayaan_submissions add column chapter_uid uuid;
alter table public.scores add column chapter_uid uuid;

-- ═══════════════════════════════════════════
-- 3. Populate chapter_uid from chapters
-- ═══════════════════════════════════════════
update public.chapter_materials cm set chapter_uid = c.uid
from public.chapters c where c.id = cm.chapter_id;

update public.chapter_progress cp set chapter_uid = c.uid
from public.chapters c where c.id = cp.chapter_id;

update public.chapter_tasks ct set chapter_uid = c.uid
from public.chapters c where c.id = ct.chapter_id;

update public.mcq_questions mq set chapter_uid = c.uid
from public.chapters c where c.id = mq.chapter_id;

update public.pengayaan_prompts pp set chapter_uid = c.uid
from public.chapters c where c.id = pp.chapter_id;

update public.pengayaan_submissions ps set chapter_uid = c.uid
from public.chapters c where c.id = ps.chapter_id;

update public.scores s set chapter_uid = c.uid
from public.chapters c where c.id = s.chapter_id;

-- ═══════════════════════════════════════════
-- 4. Drop old FKs, add new FKs, set NOT NULL
-- ═══════════════════════════════════════════

-- chapter_materials
alter table public.chapter_materials drop constraint if exists chapter_materials_chapter_id_fkey;
alter table public.chapter_materials alter column chapter_uid set not null;
alter table public.chapter_materials add foreign key (chapter_uid) references public.chapters(uid) on delete cascade;

-- chapter_progress
alter table public.chapter_progress drop constraint if exists chapter_progress_chapter_id_fkey;
alter table public.chapter_progress alter column chapter_uid set not null;
alter table public.chapter_progress add foreign key (chapter_uid) references public.chapters(uid) on delete cascade;
alter table public.chapter_progress drop constraint if exists chapter_progress_pkey;
alter table public.chapter_progress add primary key (user_id, chapter_uid);

-- chapter_tasks
alter table public.chapter_tasks drop constraint if exists chapter_tasks_chapter_id_fkey;
alter table public.chapter_tasks alter column chapter_uid set not null;
alter table public.chapter_tasks add foreign key (chapter_uid) references public.chapters(uid) on delete cascade;

-- mcq_questions
alter table public.mcq_questions drop constraint if exists mcq_questions_chapter_id_fkey;
alter table public.mcq_questions alter column chapter_uid set not null;
alter table public.mcq_questions add foreign key (chapter_uid) references public.chapters(uid) on delete cascade;

-- pengayaan_prompts (PK is chapter_id — need to migrate PK)
alter table public.pengayaan_prompts drop constraint if exists pengayaan_prompts_pkey;
alter table public.pengayaan_prompts drop constraint if exists pengayaan_prompts_chapter_id_fkey;
alter table public.pengayaan_prompts alter column chapter_uid set not null;
alter table public.pengayaan_prompts add foreign key (chapter_uid) references public.chapters(uid) on delete cascade;
alter table public.pengayaan_prompts add primary key (chapter_uid);

-- pengayaan_submissions
alter table public.pengayaan_submissions drop constraint if exists pengayaan_submissions_chapter_id_fkey;
alter table public.pengayaan_submissions alter column chapter_uid set not null;
alter table public.pengayaan_submissions add foreign key (chapter_uid) references public.chapters(uid) on delete cascade;

-- scores
alter table public.scores drop constraint if exists scores_chapter_id_fkey;
alter table public.scores alter column chapter_uid set not null;
alter table public.scores add foreign key (chapter_uid) references public.chapters(uid) on delete cascade;

-- ═══════════════════════════════════════════
-- 5. Drop chapters.id PK, make uid the new PK
-- ═══════════════════════════════════════════
alter table public.chapters drop constraint if exists chapters_pkey;
alter table public.chapters add primary key (uid);
alter table public.chapters drop column if exists id;

-- Rename for clarity
alter table public.chapters rename column uid to id;
alter table public.chapter_materials rename column chapter_uid to chapter_id;
alter table public.chapter_progress rename column chapter_uid to chapter_id;
alter table public.chapter_tasks rename column chapter_uid to chapter_id;
alter table public.mcq_questions rename column chapter_uid to chapter_id;
alter table public.pengayaan_prompts rename column chapter_uid to chapter_id;
alter table public.pengayaan_submissions rename column chapter_uid to chapter_id;
alter table public.scores rename column chapter_uid to chapter_id;

-- ═══════════════════════════════════════════
-- 6. Assign existing chapters to Kelas 1
-- ═══════════════════════════════════════════
update public.chapters set class_id = (select id from public.classes where name = 'Kelas 1' limit 1)
where class_id is null;

-- ═══════════════════════════════════════════
-- 7. Duplicate chapters for Kelas 2
-- ═══════════════════════════════════════════
do $$
declare
  v_class2_id uuid;
  v_old_chapter record;
  v_new_chapter_id uuid;
  v_old_task record;
  v_new_task_id text;
begin
  select id into v_class2_id from public.classes where name = 'Kelas 2';

  for v_old_chapter in
    select * from public.chapters where class_id = (select id from public.classes where name = 'Kelas 1')
    order by order_index
  loop
    -- Duplicate chapter
    v_new_chapter_id := gen_random_uuid();
    insert into public.chapters (id, class_id, order_index, title, subtitle, description, material_content, material_video_url, cover_emoji, cover_color, created_at, updated_at)
    values (
      v_new_chapter_id, v_class2_id,
      v_old_chapter.order_index,
      v_old_chapter.title || ' (Kls 2)',
      v_old_chapter.subtitle,
      v_old_chapter.description,
      'Materi ' || v_old_chapter.title || ' — versi Kelas 2. (placeholder)',
      v_old_chapter.material_video_url,
      v_old_chapter.cover_emoji,
      v_old_chapter.cover_color,
      now(), now()
    );

    -- Duplicate materials
    insert into public.chapter_materials (id, chapter_id, section_order, type, content, caption, created_at)
    select gen_random_uuid()::text, v_new_chapter_id, section_order, type,
           '[' || v_old_chapter.title || ' - Kls 2] ' || content, caption, now()
    from public.chapter_materials where chapter_id = v_old_chapter.id;

    -- Duplicate tasks
    for v_old_task in
      select * from public.chapter_tasks where chapter_id = v_old_chapter.id
    loop
      v_new_task_id := v_old_task.id || '-k2';
      insert into public.chapter_tasks (id, chapter_id, title, description, due_date, task_order, created_at, updated_at)
      values (
        v_new_task_id, v_new_chapter_id,
        v_old_task.title,
        v_old_task.description || ' (Kelas 2)',
        v_old_task.due_date, v_old_task.task_order,
        now(), now()
      );

      -- Duplicate questions for this task
      insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index, created_at)
      select gen_random_uuid()::text, v_new_chapter_id, v_new_task_id, assessment, question_order,
             question, options, correct_index, now()
      from public.mcq_questions where task_id = v_old_task.id;
    end loop;

    -- Duplicate pretest questions
    insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index, created_at)
    select gen_random_uuid()::text, v_new_chapter_id, null, 'pretest', question_order,
           question, options, correct_index, now()
    from public.mcq_questions where chapter_id = v_old_chapter.id and assessment = 'pretest';

    -- Duplicate posttest questions
    insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index, created_at)
    select gen_random_uuid()::text, v_new_chapter_id, null, 'posttest', question_order,
           question, options, correct_index, now()
    from public.mcq_questions where chapter_id = v_old_chapter.id and assessment = 'posttest';

    -- Duplicate pengayaan prompt
    insert into public.pengayaan_prompts (chapter_id, instruction, created_at, updated_at)
    select v_new_chapter_id, instruction, now(), now()
    from public.pengayaan_prompts where chapter_id = v_old_chapter.id;
  end loop;
end $$;

-- ═══════════════════════════════════════════
-- 8. Seed: dummy accounts
-- ═══════════════════════════════════════════

-- Helper: create auth user + app_user
do $$
declare
  v_uid uuid;
  v_class1_id uuid;
  v_class2_id uuid;
  v_teacher2_id uuid;
begin
  select id into v_class1_id from public.classes where name = 'Kelas 1';
  select id into v_class2_id from public.classes where name = 'Kelas 2';

  -- Guru002: teacher for Kelas 2
  v_uid := gen_random_uuid();
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values (v_uid, 'guru002@pasraman.id', crypt('guru123', gen_salt('bf')), now(), now(), now())
  on conflict (email) do nothing;

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
  values (v_uid, v_uid, jsonb_build_object('sub', v_uid::text, 'email', 'guru002@pasraman.id'), 'email', v_uid::text, now(), now())
  on conflict (provider, provider_id) do nothing;

  insert into public.app_users (id, email, username, display_name, role, password_hash, created_at, updated_at)
  values (v_uid, 'guru002@pasraman.id', 'guru002', 'Guru Dua', 'teacher', crypt('guru123', gen_salt('bf')), now(), now())
  on conflict (id) do nothing;

  select id into v_teacher2_id from public.app_users where username = 'guru002';

  -- Assign guru002 to Kelas 2
  insert into public.teacher_class_assignments (teacher_id, class_id)
  values (v_teacher2_id, v_class2_id)
  on conflict do nothing;

  -- 5 dummy students
  -- Siswa 3-4 → Kelas 1 (guru001)
  -- Siswa 5-7 → Kelas 2 (guru002)
  
  -- siswa003, siswa004 → Kelas 1
  for i in 3..4 loop
    v_uid := gen_random_uuid();
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    values (v_uid, 'siswa00' || i || '@pasraman.id', crypt('123456', gen_salt('bf')), now(), now(), now())
    on conflict (email) do nothing;

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    values (v_uid, v_uid, jsonb_build_object('sub', v_uid::text, 'email', 'siswa00' || i || '@pasraman.id'), 'email', v_uid::text, now(), now())
    on conflict (provider, provider_id) do nothing;

    insert into public.app_users (id, email, username, display_name, role, class_id, password_hash, created_at, updated_at)
    values (v_uid, 'siswa00' || i || '@pasraman.id', 'siswa00' || i, 'Siswa ' || i, 'student', v_class1_id, crypt('123456', gen_salt('bf')), now(), now())
    on conflict (id) do nothing;
  end loop;

  -- siswa005, siswa006, siswa007 → Kelas 2
  for i in 5..7 loop
    v_uid := gen_random_uuid();
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    values (v_uid, 'siswa00' || i || '@pasraman.id', crypt('123456', gen_salt('bf')), now(), now(), now())
    on conflict (email) do nothing;

    insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    values (v_uid, v_uid, jsonb_build_object('sub', v_uid::text, 'email', 'siswa00' || i || '@pasraman.id'), 'email', v_uid::text, now(), now())
    on conflict (provider, provider_id) do nothing;

    insert into public.app_users (id, email, username, display_name, role, class_id, password_hash, created_at, updated_at)
    values (v_uid, 'siswa00' || i || '@pasraman.id', 'siswa00' || i, 'Siswa ' || i, 'student', v_class2_id, crypt('123456', gen_salt('bf')), now(), now())
    on conflict (id) do nothing;
  end loop;
end $$;

-- ═══════════════════════════════════════════
-- 9. Update RPCs: p_chapter_id text → uuid
-- ═══════════════════════════════════════════

drop function if exists public.save_chapter_batch(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb);
drop function if exists public.delete_chapter(text);

create or replace function public.save_chapter_batch(
  p_chapter_id uuid,
  p_metadata jsonb,
  p_pengayaan jsonb,
  p_materials jsonb,
  p_tasks jsonb,
  p_pretest jsonb,
  p_posttest jsonb
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

  update public.chapters
  set
    title = coalesce(p_metadata->>'title', title),
    subtitle = coalesce(p_metadata->>'subtitle', subtitle),
    description = coalesce(p_metadata->>'description', description),
    cover_emoji = coalesce(p_metadata->>'cover_emoji', cover_emoji),
    cover_color = coalesce(p_metadata->>'cover_color', cover_color),
    updated_at = now()
  where id = p_chapter_id;

  delete from public.pengayaan_prompts where chapter_id = p_chapter_id;
  if (p_pengayaan->>'enabled')::boolean and p_pengayaan->>'instruction' is not null
     and length(trim(p_pengayaan->>'instruction')) > 0 then
    insert into public.pengayaan_prompts (chapter_id, instruction)
    values (p_chapter_id, p_pengayaan->>'instruction');
  end if;

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

  delete from public.chapter_tasks where chapter_id = p_chapter_id
    and id not in (select value->>'id' from jsonb_array_elements(p_tasks) where value->>'id' is not null)
    and not exists (select 1 from public.task_submissions where task_id = chapter_tasks.id);
  delete from public.mcq_questions where chapter_id = p_chapter_id and assessment = 'tugas'
    and task_id is not null
    and task_id not in (select id from public.chapter_tasks where chapter_id = p_chapter_id);
  
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
      )
      on conflict (id) do update set
        title = v_task->>'title',
        description = v_task->>'description',
        due_date = nullif(v_task->>'due_date', '')::date,
        task_order = (v_task->>'task_order')::int;
      
      delete from public.mcq_questions where chapter_id = p_chapter_id and task_id = v_task->>'id' and assessment = 'tugas';
      
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

  -- 5. Pretest — delete questions only (PRESERVE scores)
  delete from public.mcq_questions where chapter_id = p_chapter_id and assessment = 'pretest';
  
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

  -- 6. Posttest — delete questions only (PRESERVE scores)
  delete from public.mcq_questions where chapter_id = p_chapter_id and assessment = 'posttest';
  
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

  delete from public.chapter_progress where chapter_id = p_chapter_id;
  delete from public.material_progress where material_id in (select id from public.chapter_materials where chapter_id = p_chapter_id);

  return jsonb_build_object('ok', true, 'message', 'Bab berhasil disimpan');
end;
$$;

revoke execute on function public.save_chapter_batch(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.save_chapter_batch(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

create or replace function public.delete_chapter(
  p_chapter_id uuid
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

revoke execute on function public.delete_chapter(uuid) from public;
grant execute on function public.delete_chapter(uuid) to authenticated;

-- ═══════════════════════════════════════════
-- 10. Verify
-- ═══════════════════════════════════════════
select 'chapters: ' || count(*)::text from public.chapters
union all
select 'materials: ' || count(*)::text from public.chapter_materials
union all
select 'mcq: ' || count(*)::text from public.mcq_questions
union all
select 'tasks: ' || count(*)::text from public.chapter_tasks
union all
select 'users: ' || count(*)::text from public.app_users
union all
select 'teachers: ' || count(*)::text from public.teacher_class_assignments;

notify pgrst, 'reload schema';
