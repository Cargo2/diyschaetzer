-- Phase 13 (Block 1) – Firmenprofil für Profis (contractor)
--
-- Eigene Tabelle (1:1 zu auth.users), damit die schlanke profiles-Tabelle
-- (Auth: Rolle/Plan) nicht aufgebläht wird. Owner-scoped wie projects: jeder
-- Nutzer liest/schreibt ausschließlich sein eigenes Firmenprofil.
--
-- Das Logo wird bewusst (noch) nicht hier gespeichert – folgt als eigener Block.

create table if not exists public.company_profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  company_name text not null default '',
  contact_name text not null default '',
  street       text not null default '',
  postal_code  text not null default '',
  city         text not null default '',
  phone        text not null default '',
  email        text not null default '',
  website      text not null default '',
  vat_id       text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.company_profiles enable row level security;

create policy "company_profiles_select_own"
  on public.company_profiles for select
  using (auth.uid() = id);

create policy "company_profiles_insert_own"
  on public.company_profiles for insert
  with check (auth.uid() = id);

create policy "company_profiles_update_own"
  on public.company_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- updated_at automatisch pflegen (Funktion aus 0001 wiederverwenden)
drop trigger if exists company_profiles_set_updated_at on public.company_profiles;
create trigger company_profiles_set_updated_at
  before update on public.company_profiles
  for each row execute function public.set_updated_at();
