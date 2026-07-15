-- Phase R2 – Positions- & Textbausteinkatalog für Profis
--
-- Profis legen wiederverwendbare Angebots-Positionen und Einleitungs-/Schlusstexte
-- einmal an und nutzen sie in mehreren Angeboten. Jede Zeile gehört genau einem
-- Profi (owner-scoped RLS wie contractor_offers 0008): jeder liest/schreibt
-- ausschließlich seine eigenen Bausteine. `kind` trennt Positions- von Textbausteinen;
-- die eigentlichen Nutzdaten liegen als jsonb-Blob `data`. Wird der Nutzer gelöscht,
-- verschwinden seine Bausteine per ON DELETE CASCADE.

create table if not exists public.contractor_snippets (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  kind        text not null,
  label       text not null default '',
  data        jsonb not null default '{}'::jsonb,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Nur die drei bekannten Bausteinarten zulassen (Idiom aus 0016).
alter table public.contractor_snippets
  drop constraint if exists contractor_snippets_kind_check;
alter table public.contractor_snippets
  add constraint contractor_snippets_kind_check
    check (kind in ('position', 'intro', 'outro'));

create index if not exists contractor_snippets_owner_id_idx
  on public.contractor_snippets (owner_id);

alter table public.contractor_snippets enable row level security;

create policy "contractor_snippets_select_own"
  on public.contractor_snippets for select
  using (auth.uid() = owner_id);

create policy "contractor_snippets_insert_own"
  on public.contractor_snippets for insert
  with check (auth.uid() = owner_id);

create policy "contractor_snippets_update_own"
  on public.contractor_snippets for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "contractor_snippets_delete_own"
  on public.contractor_snippets for delete
  using (auth.uid() = owner_id);

-- updated_at automatisch pflegen (Funktion aus 0001 wiederverwenden)
drop trigger if exists contractor_snippets_set_updated_at on public.contractor_snippets;
create trigger contractor_snippets_set_updated_at
  before update on public.contractor_snippets
  for each row execute function public.set_updated_at();
