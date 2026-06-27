-- Phase 15 (Block 4) – Admin: Material anlegen & löschen
--
-- Ergänzt zu materials_admin_update (Migration 0010) die fehlenden Schreibrechte,
-- damit Admins über die UI Artikel anlegen (Duplikat) und löschen können. Weiterhin
-- gated über is_admin(); öffentlich bleibt materials nur lesbar. Beim Löschen eines
-- Materials entfernt der FK product_offers.material_id (on delete cascade,
-- Migration 0004) die zugehörigen Angebote automatisch.

create policy "materials_admin_insert"
  on public.materials for insert
  with check (public.is_admin());

create policy "materials_admin_delete"
  on public.materials for delete
  using (public.is_admin());
