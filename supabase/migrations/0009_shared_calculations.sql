-- Phase 14 – Teilen-Link: öffentlich lesbare, eingefrorene Kalkulations-Momentaufnahme
--
-- Ein Eintrag = eine geteilte Kalkulation (Snapshot als jsonb `data`). Der Token ist
-- die Zeilen-UUID (`id`, schwer erratbar). Owner-scoped: nur der Ersteller verwaltet
-- seine eigenen Shares. Öffentlicher Lesezugriff NICHT über eine permissive RLS-Policy
-- (würde Enumeration erlauben), sondern über eine SECURITY DEFINER-Funktion, die genau
-- die eine Zeile zum Token zurückgibt.

create table if not exists public.shared_calculations (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists shared_calculations_owner_id_idx
  on public.shared_calculations (owner_id);

alter table public.shared_calculations enable row level security;

-- Eigentümer verwaltet seine eigenen Shares (anlegen, auflisten, löschen).
create policy "shared_calculations_select_own"
  on public.shared_calculations for select
  using (auth.uid() = owner_id);

create policy "shared_calculations_insert_own"
  on public.shared_calculations for insert
  with check (auth.uid() = owner_id);

create policy "shared_calculations_delete_own"
  on public.shared_calculations for delete
  using (auth.uid() = owner_id);

-- Öffentlicher Lesezugriff: genau eine Zeile per Token. SECURITY DEFINER umgeht RLS
-- kontrolliert; ohne gültigen Token (UUID) kommt nichts zurück, Enumeration ist nicht
-- möglich (kein Listing, nur Punktabfrage). Fixer search_path als Härtung.
create or replace function public.get_shared_calculation(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select data from public.shared_calculations where id = p_token;
$$;

revoke all on function public.get_shared_calculation(uuid) from public;
grant execute on function public.get_shared_calculation(uuid) to anon, authenticated;
