-- Phase 15 (Block 5) – Admin: Nutzer-/Rollenübersicht (read-only)
--
-- Die profiles-RLS (Migration 0002) lässt jeden nur das EIGENE Profil lesen. Für
-- eine Admin-Übersicht braucht es daher eine kontrollierte SECURITY DEFINER-Funktion
-- (wie beim Teilen-Link, Migration 0009), die – nur für Admins – alle Nutzer mit
-- Rolle/Plan plus E-Mail aus auth.users zurückgibt. Die Rollenvergabe selbst bleibt
-- unangetastet (kein Schreibpfad hier; reine Übersicht).

create or replace function public.admin_list_users()
returns table (
  id           uuid,
  email        text,
  role         text,
  plan         text,
  display_name text,
  created_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, u.email::text, p.role, p.plan, p.display_name, u.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  -- Nur Admins sehen etwas; sonst liefert die Funktion eine leere Menge.
  where public.is_admin()
  order by u.created_at desc;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;
