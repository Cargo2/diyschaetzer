-- Phase 12 – Block 2: Row Level Security + automatische Profil-Anlage
--
-- Grundsatz: jeder Nutzer sieht/bearbeitet ausschließlich seine eigenen Daten.
-- Räume erben den Zugriff über das Eigentum am Projekt.

-- ---------------------------------------------------------------------------
-- RLS aktivieren
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.rooms    enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: nur das eigene Profil lesen/ändern. Anlage erfolgt per Trigger
-- (security definer), ein Self-Insert bleibt als Fallback erlaubt.
-- Rollenänderung über die App ist hier NICHT vorgesehen (admin setzt manuell).
-- ---------------------------------------------------------------------------
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- projects: ausschließlich der Eigentümer
-- ---------------------------------------------------------------------------
create policy "projects_select_own"
  on public.projects for select
  using (auth.uid() = owner_id);

create policy "projects_insert_own"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "projects_update_own"
  on public.projects for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "projects_delete_own"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- rooms: Zugriff über Eigentum am Projekt
-- ---------------------------------------------------------------------------
create policy "rooms_select_via_project"
  on public.rooms for select
  using (exists (
    select 1 from public.projects p
    where p.id = rooms.project_id and p.owner_id = auth.uid()
  ));

create policy "rooms_insert_via_project"
  on public.rooms for insert
  with check (exists (
    select 1 from public.projects p
    where p.id = rooms.project_id and p.owner_id = auth.uid()
  ));

create policy "rooms_update_via_project"
  on public.rooms for update
  using (exists (
    select 1 from public.projects p
    where p.id = rooms.project_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = rooms.project_id and p.owner_id = auth.uid()
  ));

create policy "rooms_delete_via_project"
  on public.rooms for delete
  using (exists (
    select 1 from public.projects p
    where p.id = rooms.project_id and p.owner_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- Automatische Profil-Anlage bei Registrierung.
-- Rolle/Anzeigename werden aus den Signup-Metadaten übernommen
-- (Frontend setzt z. B. role = 'customer' | 'contractor' beim Sign-up).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    case
      when new.raw_user_meta_data ->> 'role' in ('customer', 'contractor')
        then new.raw_user_meta_data ->> 'role'
      else 'customer'
    end,
    new.raw_user_meta_data ->> 'display_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
