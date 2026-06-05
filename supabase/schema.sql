-- Wasi Supabase Schema v2 — paste into Supabase SQL Editor → Run
-- Project: https://vrearsyfsguaerlcmkim.supabase.co
--
-- Creates 5 tables with HYBRID auth model:
--   - Guest mode:  writes where owner_id IS NULL  (anonymous, no signup needed)
--   - Auth mode:   writes where owner_id = auth.uid()  (signed-in user)
--   - Sign-in migration: UPDATEs guest rows to set owner_id = auth.uid()
--
-- RLS policy shape (one per table):
--   using       ((owner_id IS NULL) OR (auth.uid() = owner_id))
--   with check  ((owner_id IS NULL) OR (auth.uid() = owner_id))
-- This means:
--   - Anonymous client can read/write ONLY where owner_id IS NULL
--   - Authenticated client can read/write ONLY their own rows
--   - Server (service_role key) bypasses RLS entirely

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── conversations ─────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  occasion text,
  budget int,
  language text default 'en',
  created_at timestamptz default now()
);
create index if not exists conversations_session_id_idx on public.conversations(session_id);
create index if not exists conversations_owner_id_idx  on public.conversations(owner_id);

-- ── messages ─────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text,
  tool_calls jsonb,
  products jsonb,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
create index if not exists messages_session_id_created_at_idx
  on public.messages(session_id, created_at asc);
create index if not exists messages_owner_id_created_at_idx
  on public.messages(owner_id, created_at asc);

-- ── carts ────────────────────────────────────────────────────────────────────
create table if not exists public.carts (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null unique,
  owner_id uuid references auth.users(id) on delete cascade unique,
  status text default 'active',
  updated_at timestamptz default now()
);
create index if not exists carts_owner_id_idx on public.carts(owner_id);

-- ── cart_items (anonymous guest cart, no auth) ───────────────────────────────
create table if not exists public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  product_code text not null,
  product_name text not null,
  quantity int not null default 1,
  price_lkr numeric(10,2) not null,
  image_url text,
  category text,
  variant_id text,
  variant_name text,
  created_at timestamptz default now(),
  -- Partial unique: only one row per (session, product) for guests, one per (owner, product) for authed
  -- (we can't have a single UNIQUE on both session_id and owner_id, so we drop the simple unique
  --  and rely on app-level dedup; the upsert in useSupabaseCart still works on the existing rows)
  unique (session_id, product_code)
);
create index if not exists cart_items_session_id_idx on public.cart_items(session_id);
create index if not exists cart_items_owner_id_idx  on public.cart_items(owner_id);

-- ── orders ───────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  kapruka_order_ref text,
  total_lkr numeric(12,2) not null,
  delivery_fee numeric(12,2) default 0,
  items_total numeric(12,2) default 0,
  icing_charge numeric(12,2) default 0,
  recipient_name text,
  recipient_phone text,
  delivery_address text,
  delivery_city text,
  delivery_date date,
  sender_name text,
  checkout_url text,
  status text default 'pending',
  created_at timestamptz default now()
);
create index if not exists orders_session_id_idx on public.orders(session_id);
create index if not exists orders_owner_id_idx  on public.orders(owner_id);

-- ── user_profiles (one row per auth.users) ──────────────────────────────────
-- Personalization surface for the concierge LLM. The LLM reads these fields
-- from SESSION_CONTEXT on every /api/chat turn and uses them to:
--   - greet by first name in the user's chosen language
--   - reference DOB for birthday-driven suggestions
--   - tailor age / gender-appropriate products
--   - localise to the user's home city
create table if not exists public.user_profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  first_name     text,
  last_name      text,
  email          text,
  preferred_language text default 'en' check (preferred_language in ('en','si','ta')),
  date_of_birth  date,
  gender         text check (gender in ('female','male','nonbinary','prefer_not_to_say')),
  city           text,
  typical_recipient text check (typical_recipient in ('self','partner','parent','child','friend','colleague','other')),
  interests      text[] default '{}',
  profile_complete boolean default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index if not exists user_profiles_email_idx on public.user_profiles(email);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- HYBRID: guest (owner_id IS NULL) OR owner (auth.uid() = owner_id)
-- For user_profiles, only the owner themselves can read/write their own profile
alter table public.conversations enable row level security;
alter table public.messages       enable row level security;
alter table public.carts          enable row level security;
alter table public.cart_items     enable row level security;
alter table public.orders         enable row level security;
alter table public.user_profiles  enable row level security;

-- Drop legacy "Public access" policies (from v1, allow-everyone)
drop policy if exists "Public access" on public.conversations;
drop policy if exists "Public access" on public.messages;
drop policy if exists "Public access" on public.carts;
drop policy if exists "Public access" on public.cart_items;
drop policy if exists "Public access" on public.orders;
drop policy if exists "Public access" on public.user_profiles;

-- Drop the new policy if rerunning
drop policy if exists "Hybrid guest-or-owner access" on public.conversations;
drop policy if exists "Hybrid guest-or-owner access" on public.messages;
drop policy if exists "Hybrid guest-or-owner access" on public.carts;
drop policy if exists "Hybrid guest-or-owner access" on public.cart_items;
drop policy if exists "Hybrid guest-or-owner access" on public.orders;
drop policy if exists "Owner manages own profile" on public.user_profiles;

-- HYBRID policies — one per table
--   SELECT: pass if owner_id IS NULL (guest row) OR auth.uid() = owner_id (own row)
--   INSERT/UPDATE: WITH CHECK enforces same logic — client must NOT set owner_id for someone else
create policy "Hybrid guest-or-owner access"
  on public.conversations for all
  using       ((owner_id IS NULL) OR (auth.uid() = owner_id))
  with check  ((owner_id IS NULL) OR (auth.uid() = owner_id));

create policy "Hybrid guest-or-owner access"
  on public.messages for all
  using       ((owner_id IS NULL) OR (auth.uid() = owner_id))
  with check  ((owner_id IS NULL) OR (auth.uid() = owner_id));

create policy "Hybrid guest-or-owner access"
  on public.carts for all
  using       ((owner_id IS NULL) OR (auth.uid() = owner_id))
  with check  ((owner_id IS NULL) OR (auth.uid() = owner_id));

create policy "Hybrid guest-or-owner access"
  on public.cart_items for all
  using       ((owner_id IS NULL) OR (auth.uid() = owner_id))
  with check  ((owner_id IS NULL) OR (auth.uid() = owner_id));

create policy "Hybrid guest-or-owner access"
  on public.orders for all
  using       ((owner_id IS NULL) OR (auth.uid() = owner_id))
  with check  ((owner_id IS NULL) OR (auth.uid() = owner_id));

-- User profiles — owner only (no guest profiles)
create policy "Owner manages own profile"
  on public.user_profiles for all
  using       (auth.uid() = user_id)
  with check  (auth.uid() = user_id);

-- ── Trigger: auto-create profile row on signup ──────────────────────────────
-- Whenever a new auth.users row is inserted (e.g. via supabase.auth.signUp),
-- auto-create an empty user_profiles row so the client can immediately update fields.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
