-- Phase 15 (Block 3) – Admin-Schreibzugriff auf Affiliate-Angebote
--
-- Baut auf is_admin() (Migration 0010) auf. Admins dürfen product_offers eines
-- Materials pflegen (anlegen/aktualisieren/löschen) – die Admin-UI ersetzt je
-- Material den kompletten Satz an Angeboten (delete + insert). Öffentlich bleibt
-- product_offers nur lesbar (Policy aus Migration 0004); Schreiben ist Admin-only.

create policy "product_offers_admin_insert"
  on public.product_offers for insert
  with check (public.is_admin());

create policy "product_offers_admin_update"
  on public.product_offers for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "product_offers_admin_delete"
  on public.product_offers for delete
  using (public.is_admin());
