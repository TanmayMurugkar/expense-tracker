-- ════════════════════════════════════════════════════════════════════════════
--  Adds data-processing consent tracking to profiles (Phase 9 — compliance).
--  Run in the Supabase SQL Editor after 0001_init.sql.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists data_processing_consent boolean not null default false,
  add column if not exists consent_accepted_at timestamptz;

-- Redefine the signup trigger so consent captured at sign-up (passed via auth
-- user metadata) is persisted on the profile row even before email confirmation
-- creates a session.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, data_processing_consent, consent_accepted_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'data_processing_consent')::boolean, false),
    case
      when (new.raw_user_meta_data ->> 'data_processing_consent') = 'true'
      then timezone('utc', now())
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
