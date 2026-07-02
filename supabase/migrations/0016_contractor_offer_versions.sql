-- Phase 13 – Mehrere Angebote/Versionen pro Projekt
--
-- Bisher: PK = project_id → genau ein Angebot je Projekt. Jetzt: eigener PK `id`,
-- damit mehrere Angebote/Versionen je Projekt möglich sind (V1/V2 …) inkl. Status
-- (Entwurf/versendet/angenommen). `project_id` bleibt als (indizierte) FK-Spalte mit
-- ON DELETE CASCADE erhalten. Owner-scoped RLS aus 0008 gilt unverändert (owner_id).

alter table public.contractor_offers
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists version integer not null default 1,
  add column if not exists status text not null default 'draft',
  add column if not exists label text not null default '';

-- Primärschlüssel von project_id auf id umstellen (idempotent: vorhandenen PK lösen).
do $$
declare
  pk_name text;
begin
  select conname into pk_name
  from pg_constraint
  where conrelid = 'public.contractor_offers'::regclass and contype = 'p';
  if pk_name is not null then
    execute format('alter table public.contractor_offers drop constraint %I', pk_name);
  end if;
end $$;

alter table public.contractor_offers
  add constraint contractor_offers_pkey primary key (id);

alter table public.contractor_offers
  drop constraint if exists contractor_offers_status_check;
alter table public.contractor_offers
  add constraint contractor_offers_status_check
    check (status in ('draft', 'sent', 'accepted'));

create index if not exists contractor_offers_project_id_idx
  on public.contractor_offers (project_id);
