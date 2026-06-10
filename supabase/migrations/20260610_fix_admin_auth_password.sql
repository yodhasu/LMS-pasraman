-- Fix admin001 auth password: sync app_users.password_hash to auth.users.encrypted_password
-- This is a one-shot fix — anon-callable so we can run it before login works
create or replace function public.fix_admin001_auth()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_pw_hash text;
begin
  select password_hash into v_pw_hash
  from public.app_users where username = 'admin001';
  
  if v_pw_hash is null then
    return jsonb_build_object('ok', false, 'message', 'admin001 not found or no password_hash');
  end if;

  update auth.users
  set encrypted_password = v_pw_hash, updated_at = now()
  where id = '09a98266-8f80-48df-a3fd-81d117b67cfa'::uuid;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'auth user not found');
  end if;

  return jsonb_build_object('ok', true, 'message', 'Auth password synced for admin001');
end;
$$;

revoke execute on function public.fix_admin001_auth() from public;
grant execute on function public.fix_admin001_auth() to anon;
