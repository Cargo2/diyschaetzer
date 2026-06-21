-- Phase 12 – Block 2: Grundschema (Profile, Projekte, Räume)
--
-- Mapping zum bisherigen lokalen Datenmodell:
--   LocalTileProject        -> public.projects
--   SavedRoomCalculation[]  -> public.rooms (1:n, sortiert über "position")
--   wizardData / materialListUserState bleiben verschachtelte Domänen-Blobs (jsonb).
--
-- Rollen-Mapping (siehe commercial.model.ts): Hobby = customer, Profi = contractor, dazu admin.

-- ---------------------------------------------------------------------------
-- profiles: 1:1 zu auth.users, hält Rolle + Plan + (später) Firmenprofil
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null default 'customer'
               check (role in ('customer', 'contractor', 'admin')),
  plan         text not null default 'free'
               check (plan in ('free', 'plus', 'pro', 'business', 'enterprise')),
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Profil je Auth-Nutzer. role: customer (Hobby) | contractor (Profi) | admin.';

-- ---------------------------------------------------------------------------
-- projects: ein gespeichertes Fliesenprojekt je Eintrag, dem Eigentümer zugeordnet
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null default 'Mein Fliesenprojekt',
  status     text not null default 'draft'
             check (status in ('draft', 'in_progress', 'ready_for_review', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);

-- ---------------------------------------------------------------------------
-- rooms: Räume eines Projekts. wizard_data/material_list_user_state als jsonb.
-- ---------------------------------------------------------------------------
create table if not exists public.rooms (
  id                       uuid primary key default gen_random_uuid(),
  project_id               uuid not null references public.projects (id) on delete cascade,
  room_name                text not null,
  room_type                text not null,
  is_outdoor               boolean not null default false,
  wizard_data              jsonb not null,
  material_list_user_state jsonb not null
                           default '{"includeOptionalMaterials":true,"excludedMaterialIds":[]}'::jsonb,
  position                 integer not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists rooms_project_id_idx on public.rooms (project_id);

-- ---------------------------------------------------------------------------
-- updated_at automatisch pflegen
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger rooms_set_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();
