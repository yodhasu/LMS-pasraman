-- LMS Pasraman — Username + Password Auth
-- Adds password_hash to app_users and a verification RPC.
-- Login flow: user enters username → RPC verifies password → returns internal email → signInWithPassword

-- 1. Add password_hash column (nullable — Google OAuth users have no password)
alter table public.app_users add column if not exists password_hash text;

-- 2. RPC: verify username + password, returns user_id + email if valid
-- SECURITY DEFINER so anon users can call it during login
create or replace function public.verify_user_password(
  username_input text,
  password_input text
)
returns table(user_id uuid, email text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select u.id, u.email
  from public.app_users u
  where u.username = username_input
    and u.password_hash is not null
    and u.password_hash = crypt(password_input, u.password_hash)
  limit 1;
end;
$$;

revoke execute on function public.verify_user_password(username_input text, password_input text) from public;
grant execute on function public.verify_user_password(username_input text, password_input text) to anon, authenticated;

-- 3. Helper: create app user with hashed password
create or replace function public.create_app_user(
  p_username text,
  p_password text,
  p_display_name text,
  p_role public.app_role default 'student'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_email text;
begin
  -- Only teachers/admins can create users
  if not public.is_teacher_or_admin() then
    raise exception 'Only teachers can create users';
  end if;

  v_email := p_username || '@pasraman.id';
  v_user_id := gen_random_uuid();

  -- Create Supabase Auth user
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change_token_new, email_change_token_current,
    recovery_token, reauthentication_token, is_sso_user, is_anonymous
  ) values (
    v_user_id, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('display_name', p_display_name, 'username', p_username),
    now(), now(), '', '', '', '', '', false, false
  );

  -- Create identity
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_user_id, v_user_id::text, jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());

  -- Create app_user with hashed password
  insert into public.app_users (id, email, username, display_name, role, password_hash)
  values (v_user_id, v_email, p_username, p_display_name, p_role, crypt(p_password, gen_salt('bf')));

  return v_user_id;
end;
$$;

revoke execute on function public.create_app_user(p_username text, p_password text, p_display_name text, p_role public.app_role) from public;
grant execute on function public.create_app_user(p_username text, p_password text, p_display_name text, p_role public.app_role) to authenticated;

-- 4. Update existing seeded users with password_hash
update public.app_users
set password_hash = crypt('pasraman123', gen_salt('bf'))
where username in ('siswa001', 'guru001', 'santri001')
  and password_hash is null;
