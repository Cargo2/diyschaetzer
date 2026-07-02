-- Phase 13 – Angebot per Link teilen: öffentlich lesbare, eingefrorene Momentaufnahme
--
-- Analog zu shared_calculations (0009): ein Eintrag = ein geteiltes Angebot (Snapshot
-- des neutralen Exportdokuments als jsonb `data`). Token = Zeilen-UUID. Owner-scoped:
-- nur der Ersteller verwaltet seine Shares. Öffentlicher Lesezugriff NICHT über eine
-- permissive RLS-Policy (Enumeration), sondern über eine SECURITY DEFINER-Funktion,
-- die genau die eine Zeile zum Token liefert.

create table if not exists public.shared_offers (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists shared_offers_owner_id_idx
  on public.shared_offers (owner_id);

alter table public.shared_offers enable row level security;

create policy "shared_offers_select_own"
  on public.shared_offers for select
  using (auth.uid() = owner_id);

create policy "shared_offers_insert_own"
  on public.shared_offers for insert
  with check (auth.uid() = owner_id);

create policy "shared_offers_delete_own"
  on public.shared_offers for delete
  using (auth.uid() = owner_id);

-- Öffentlicher Lesezugriff: genau eine Zeile per Token (Punktabfrage, keine Enumeration).
create or replace function public.get_shared_offer(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select data from public.shared_offers where id = p_token;
$$;

revoke all on function public.get_shared_offer(uuid) from public;
grant execute on function public.get_shared_offer(uuid) to anon, authenticated;
