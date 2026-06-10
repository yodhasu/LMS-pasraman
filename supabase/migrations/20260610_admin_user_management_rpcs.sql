-- Admin user management RPCs
-- Provides CRUD operations for users (admin only).

-- ── Helper: is_admin check ──
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_users where id = auth.uid() and role = 'admin');
$$;

-- ── 1. List all users (admin only) ──
create or replace function public.admin_get_users()
returns table(
  id uuid,
  username text,
  display_name text,
  role public.app_role,
  class_id uuid,
  class_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  return query
  select
    u.id,
    u.username,
    u.display_name,
    u.role,
    u.class_id,
    c.name as class_name,
    u.created_at
  from public.app_users u
  left join public.classes c on c.id = u.class_id
  order by u.created_at desc;
end;
$$;

revoke execute on function public.admin_get_users() from public;
revoke execute on function public.admin_get_users() from anon;
grant execute on function public.admin_get_users() to authenticated;


-- ── 2. Update user (admin only) ──
create or replace function public.admin_update_user(
  p_user_id uuid,
  p_display_name text default null,
  p_role public.app_role default null,
  p_class_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clear_class boolean := false;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  -- Sentinel UUID 00000000-0000-0000-0000-000000000000 = clear class_id to null
  v_clear_class := p_class_id is not null and p_class_id = '00000000-0000-0000-0000-000000000000'::uuid;
  if v_clear_class then
    p_class_id := null;
  end if;

  if p_display_name is not null then
    update public.app_users set display_name = p_display_name, updated_at = now() where id = p_user_id;
  end if;

  if p_role is not null then
    update public.app_users set role = p_role, updated_at = now() where id = p_user_id;
  end if;

  if v_clear_class or p_class_id is not null then
    update public.app_users set class_id = p_class_id, updated_at = now() where id = p_user_id;
    update public.app_users u set class_name = (select name from public.classes where id = p_class_id) where u.id = p_user_id;
  end if;

  return jsonb_build_object('ok', true, 'message', 'User updated');
end;
$$;

revoke execute on function public.admin_update_user(uuid, text, public.app_role, uuid) from public;
revoke execute on function public.admin_update_user(uuid, text, public.app_role, uuid) from anon;
grant execute on function public.admin_update_user(uuid, text, public.app_role, uuid) to authenticated;


-- ── 3. Delete user with cascade (admin only) ──
create or replace function public.admin_delete_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_username text;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  select username into v_username from public.app_users where id = p_user_id;
  if v_username is null then return jsonb_build_object('ok', false, 'message', 'User not found'); end if;

  delete from public.teacher_class_assignments where teacher_id = p_user_id;
  delete from public.chapter_progress where user_id = p_user_id;
  delete from public.material_progress where user_id = p_user_id;
  delete from public.scores where user_id = p_user_id;
  delete from public.task_submissions where user_id = p_user_id;
  delete from public.pengayaan_submissions where user_id = p_user_id;
  delete from public.app_users where id = p_user_id;
  delete from auth.identities where user_id = p_user_id;
  delete from auth.users where id = p_user_id;

  return jsonb_build_object('ok', true, 'message', format('User %s deleted with all data', v_username));
end;
$$;

revoke execute on function public.admin_delete_user(uuid) from public;
revoke execute on function public.admin_delete_user(uuid) from anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;


-- ── 4. Reset user password (admin only) ──
create or replace function public.admin_reset_password(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_username text; v_new_password text; v_email text;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  select username, email into v_username, v_email from public.app_users where id = p_user_id;
  if v_username is null then return jsonb_build_object('ok', false, 'message', 'User not found'); end if;

  v_new_password := 'pasraman-' || v_username;
  update public.app_users set password_hash = crypt(v_new_password, gen_salt('bf')), updated_at = now() where id = p_user_id;
  update auth.users set encrypted_password = crypt(v_new_password, gen_salt('bf')), updated_at = now() where id = p_user_id;

  return jsonb_build_object('ok', true, 'message', format('Password %s direset menjadi pasraman-%s', v_username, v_username), 'password', v_new_password);
end;
$$;

revoke execute on function public.admin_reset_password(uuid) from public;
revoke execute on function public.admin_reset_password(uuid) from anon;
grant execute on function public.admin_reset_password(uuid) to authenticated;
