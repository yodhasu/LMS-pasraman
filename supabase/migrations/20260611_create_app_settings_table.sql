-- LMS Pasraman — App settings table for storing dynamic config
-- Used by Google Drive OAuth to store refresh/access tokens securely

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Only service_role can read/write
create policy "app_settings: service_role only"
  on public.app_settings for all
  to authenticated
  using (false)
  with check (false);

-- Trigger to auto-update updated_at
create or replace function public.set_app_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_app_settings_updated_at();

notify pgrst, 'reload schema';
