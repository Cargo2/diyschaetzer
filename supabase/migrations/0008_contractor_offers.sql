-- Phase 13 – Profi-Angebote: editierbares Leistungsverzeichnis pro Projekt
--
-- Ein Angebot je Projekt (project_id = PK). Das bearbeitete Leistungsverzeichnis
-- (Gruppen/Positionen + MwSt./Meta) liegt als jsonb-Blob `offer_data`. Owner-scoped
-- wie company_profiles: jeder Profi liest/schreibt ausschließlich seine eigenen Angebote.
-- Wird das Projekt gelöscht, verschwindet das Angebot per ON DELETE CASCADE.

create table if not exists public.contractor_offers (
  project_id  uuid primary key references public.projects (id) on delete cascade,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  offer_data  jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contractor_offers_owner_id_idx
  on public.contractor_offers (owner_id);

alter table public.contractor_offers enable row level security;

create policy "contractor_offers_select_own"
  on public.contractor_offers for select
  using (auth.uid() = owner_id);

create policy "contractor_offers_insert_own"
  on public.contractor_offers for insert
  with check (auth.uid() = owner_id);

create policy "contractor_offers_update_own"
  on public.contractor_offers for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "contractor_offers_delete_own"
  on public.contractor_offers for delete
  using (auth.uid() = owner_id);

-- updated_at automatisch pflegen (Funktion aus 0001 wiederverwenden)
drop trigger if exists contractor_offers_set_updated_at on public.contractor_offers;
create trigger contractor_offers_set_updated_at
  before update on public.contractor_offers
  for each row execute function public.set_updated_at();
