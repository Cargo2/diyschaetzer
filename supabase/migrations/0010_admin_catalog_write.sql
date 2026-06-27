-- Phase 15 (Block 2) – Admin-Schreibzugriff auf den Materialkatalog
--
-- Bis hier waren materials/work_steps/product_offers öffentlich lesbar, aber nur
-- per service_role beschreibbar (Migration 0004). Für die Admin-UI braucht ein
-- angemeldeter Admin einen kontrollierten Schreibpfad aus dem Browser.
--
-- Grundsatz: KEINE generelle Schreibpolicy für authenticated. Stattdessen prüft
-- eine zentrale is_admin()-Funktion die Rolle in profiles. Die Rolle 'admin' wird
-- weiterhin ausschließlich serverseitig vergeben (Migration 0003), nie über die App.
-- Dieser Block öffnet bewusst NUR materials (UPDATE); work_steps/product_offers
-- folgen in einem späteren Block mit eigener UI.

-- ---------------------------------------------------------------------------
-- is_admin(): true, wenn der aktuelle Nutzer ein Admin ist. SECURITY DEFINER,
-- damit die Prüfung unabhängig von der profiles-RLS funktioniert (kein Risiko
-- einer Policy-Rekursion). Fixer search_path als Härtung.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- materials: Admins dürfen bestehende Artikel aktualisieren. Anlegen/Löschen
-- bleibt vorerst service_role-only (kommt mit eigener UI in einem späteren Block).
-- ---------------------------------------------------------------------------
create policy "materials_admin_update"
  on public.materials for update
  using (public.is_admin())
  with check (public.is_admin());
