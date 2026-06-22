-- Phase 12 – Sicherheits-Fix: role/plan gegen Self-Eskalation schützen
--
-- Problem: Die Policy `profiles_update_own` erlaubt einem Nutzer, seine eigene
-- Profilzeile zu ändern. Postgres-RLS ist nicht spaltenbasiert, daher konnte ein
-- angemeldeter Nutzer per direktem API-Call `role = 'admin'` oder
-- `plan = 'enterprise'` auf sich selbst setzen (Rechte-Eskalation).
--
-- Lösung: Ein BEFORE-UPDATE-Trigger friert `role`/`plan` für angemeldete
-- Endnutzer ein. Legitime Admin-Pfade bleiben erlaubt:
--   * Kein Auth-Kontext (auth.uid() IS NULL) -> service_role / direkter SQL /
--     Supabase-Studio / der handle_new_user-Trigger bei der Registrierung.
--   * Angemeldeter Nutzer mit role = 'admin'.
-- Alle anderen Spalten (display_name, …) bleiben über `profiles_update_own`
-- weiterhin durch den Nutzer änderbar.

create or replace function public.protect_profile_role_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Kein angemeldeter Nutzer-Kontext: service_role / direkter Admin-Zugriff /
  -- Registrierungs-Trigger -> Änderung an role/plan zulassen.
  if auth.uid() is null then
    return new;
  end if;

  -- Angemeldeter Admin darf role/plan ändern.
  if exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    return new;
  end if;

  -- Sonst: role/plan sind unveränderlich -> auf die alten Werte zurücksetzen.
  new.role := old.role;
  new.plan := old.plan;
  return new;
end;
$$;

-- Idempotent (erlaubt erneutes Anwenden bei lokalen DB-Resets).
drop trigger if exists profiles_protect_role_plan on public.profiles;

create trigger profiles_protect_role_plan
  before update on public.profiles
  for each row execute function public.protect_profile_role_plan();
