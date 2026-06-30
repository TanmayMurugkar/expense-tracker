-- ════════════════════════════════════════════════════════════════════════════
--  Expense Tracker — Initial schema, RLS & storage policies
--  Run this in the Supabase SQL Editor. Safe to re-run (drops & recreates).
--  NOTE: This drops any existing test data in profiles/statements/transactions.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Clean slate (idempotent) ────────────────────────────────────────────────
drop table if exists public.transactions cascade;
drop table if exists public.statements   cascade;
drop table if exists public.profiles      cascade;

-- ─── 1. Profiles (1:1 with auth.users) ───────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  currency    text not null default 'INR',
  updated_at  timestamptz not null default timezone('utc', now())
);

-- ─── 2. Statements (upload log) ──────────────────────────────────────────────
create table public.statements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  file_name      text not null,
  storage_path   text not null,
  statement_type text not null check (statement_type in ('bank', 'credit_card')),
  status         text not null default 'processing'
                   check (status in ('processing', 'completed', 'failed')),
  error_message  text,
  uploaded_at    timestamptz not null default timezone('utc', now())
);

create index statements_user_id_idx on public.statements(user_id);

-- ─── 3. Transactions (visualization source) ──────────────────────────────────
create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  statement_id     uuid references public.statements(id) on delete set null,
  transaction_date date not null,
  description      text not null,
  clean_merchant   text,
  amount           numeric(12, 2) not null,
  transaction_type text not null check (transaction_type in ('debit', 'credit')),
  category         text not null default 'Other',
  created_at       timestamptz not null default timezone('utc', now())
);

create index transactions_user_id_idx      on public.transactions(user_id);
create index transactions_statement_id_idx on public.transactions(statement_id);
create index transactions_date_idx         on public.transactions(transaction_date);

-- ════════════════════════════════════════════════════════════════════════════
--  Row-Level Security — default-deny, owner-scoped on every table
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles     enable row level security;
alter table public.statements   enable row level security;
alter table public.transactions enable row level security;

-- Profiles: a user can only see/update their own profile row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Statements: full CRUD scoped to the owner
create policy "statements_select_own" on public.statements
  for select using (auth.uid() = user_id);
create policy "statements_insert_own" on public.statements
  for insert with check (auth.uid() = user_id);
create policy "statements_update_own" on public.statements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "statements_delete_own" on public.statements
  for delete using (auth.uid() = user_id);

-- Transactions: full CRUD scoped to the owner
create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════════
--  Auto-create a profile row whenever a new auth user signs up
--  SECURITY DEFINER with a locked search_path (prevents privilege escalation)
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════════
--  Storage — private 'statements' bucket, per-user {user_id}/... prefix
--  The first path segment of the object name must equal the caller's uid.
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('statements', 'statements', false)
on conflict (id) do update set public = false;

drop policy if exists "statements_read_own"   on storage.objects;
drop policy if exists "statements_insert_own" on storage.objects;
drop policy if exists "statements_update_own" on storage.objects;
drop policy if exists "statements_delete_own" on storage.objects;

create policy "statements_read_own" on storage.objects
  for select using (
    bucket_id = 'statements'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "statements_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'statements'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "statements_update_own" on storage.objects
  for update using (
    bucket_id = 'statements'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "statements_delete_own" on storage.objects
  for delete using (
    bucket_id = 'statements'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
