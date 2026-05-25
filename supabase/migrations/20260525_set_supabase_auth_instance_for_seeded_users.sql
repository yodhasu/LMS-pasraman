update auth.users
set instance_id = '00000000-0000-0000-0000-000000000000'
where email in ('siswa001@pasraman.id', 'guru001@pasraman.id', 'santri001@pasraman.id')
  and instance_id is null;
