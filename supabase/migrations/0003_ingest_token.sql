-- ════════════════════════════════════════════════════════════════════════════
--  Per-user inbound email alias token (Phase 10 — email ingestion).
--  Each user gets a unique token used in their address:
--      ingest-<token>@parse.yourapp.com
--  Run in the Supabase SQL Editor after 0002.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Add the column (nullable first so we can backfill existing rows).
alter table public.profiles
  add column if not exists ingest_token text;

-- 2. Backfill any existing profiles with a random token.
update public.profiles
  set ingest_token = replace(gen_random_uuid()::text, '-', '')
  where ingest_token is null;

-- 3. Lock it down: default for new rows, not-null, unique.
alter table public.profiles
  alter column ingest_token set default replace(gen_random_uuid()::text, '-', ''),
  alter column ingest_token set not null;

create unique index if not exists profiles_ingest_token_idx
  on public.profiles(ingest_token);
