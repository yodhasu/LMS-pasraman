update auth.users
set
  instance_id = coalesce(instance_id, '00000000-0000-0000-0000-000000000000'),
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, '')
where email in ('siswa001@pasraman.id', 'guru001@pasraman.id', 'santri001@pasraman.id');
