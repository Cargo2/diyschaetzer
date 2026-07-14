-- Phase 13/18 – Teilen-Link-Tracking + Annahme für geteilte Angebote
--
-- Erweitert `shared_offers` (0017) um leichtgewichtiges Tracking (Aufrufe) und eine
-- öffentliche, set-once Angebots-Annahme durch den Empfänger. Wie bei 0017/0009 gilt:
-- öffentlicher Zugriff läuft NICHT über permissive anon-RLS-Policies (Enumeration),
-- sondern ausschließlich über SECURITY-DEFINER-Punktfunktionen per Token (Zeilen-UUID).
-- Der Owner (Ersteller) darf zusätzlich seine eigene Zeile aktualisieren/lesen (RLS).

-- ── Tracking-/Annahme-Spalten (additiv, idempotent) ─────────────────────────
alter table public.shared_offers
  add column if not exists offer_id         uuid references public.contractor_offers (id) on delete set null,
  add column if not exists viewed_at        timestamptz,
  add column if not exists last_viewed_at   timestamptz,
  add column if not exists view_count       int not null default 0,
  add column if not exists accepted_at      timestamptz,
  add column if not exists accepted_by_name text not null default '';

-- Ein stabiler Token je Angebot: pro (owner, offer_id) höchstens ein Share-Eintrag.
-- Partiell, damit Alt-Zeilen ohne offer_id (0017) unberührt bleiben.
create unique index if not exists shared_offers_owner_offer_uidx
  on public.shared_offers (owner_id, offer_id)
  where offer_id is not null;

-- ── RLS: Owner darf die eigene Zeile aktualisieren (Tracking-Reset o. Ä.) ────
-- Select/Insert/Delete-Policies stammen aus 0017. Update war bisher nicht erlaubt;
-- öffentliches Tracking/Annehmen läuft trotzdem NUR über die Definer-Funktionen.
create policy "shared_offers_update_own"
  on public.shared_offers for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ── Öffentliche Punktfunktion: Angebot + Annahme-Status per Token ───────────
-- Liefert data + Annahme-Status in einem Aufruf (read-only Ansicht). Legacy
-- `get_shared_offer` (0017) bleibt UNVERÄNDERT (gecachte alte Bundles nutzen es noch).
create or replace function public.get_shared_offer_page(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'data', data,
           'accepted_at', accepted_at,
           'accepted_by_name', accepted_by_name
         )
    from public.shared_offers
   where id = p_token;
$$;

revoke all on function public.get_shared_offer_page(uuid) from public;
grant execute on function public.get_shared_offer_page(uuid) to anon, authenticated;

-- ── Aufruf-Zähler: throttled auf 10 Minuten, gedeckelt ──────────────────────
-- Ein einzelnes UPDATE. Unbekannter Token = no-op (0 Zeilen, kein Fehler). Der
-- Zähler steigt höchstens alle 10 Minuten (kein Reload-Spam), hart gedeckelt.
create or replace function public.ping_shared_offer(p_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.shared_offers
     set view_count = least(
           view_count + (case
             when last_viewed_at is null or last_viewed_at < now() - interval '10 minutes'
             then 1 else 0 end),
           100000
         ),
         viewed_at = coalesce(viewed_at, now()),
         last_viewed_at = now()
   where id = p_token;
$$;

revoke all on function public.ping_shared_offer(uuid) from public;
grant execute on function public.ping_shared_offer(uuid) to anon, authenticated;

-- ── Angebots-Annahme durch den Empfänger (set-once) ─────────────────────────
-- Namensvalidierung serverseitig (2..120 Zeichen). Set-once: nur wenn noch nicht
-- angenommen; ein zweiter Aufruf überschreibt nie, sondern liefert die erste
-- Annahme zurück. Bei erfolgreicher Erst-Annahme mit verknüpftem Angebot wird
-- `contractor_offers.status` auf 'accepted' gesetzt (im Check-Constraint aus 0016).
-- Rückgabe: aktueller Annahme-Stand, oder null bei unbekanntem Token.
create or replace function public.accept_shared_offer(p_token uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer_id uuid;
  v_updated  boolean := false;
  v_result   jsonb;
begin
  if length(btrim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'invalid_name';
  end if;

  update public.shared_offers
     set accepted_at = now(),
         accepted_by_name = btrim(p_name)
   where id = p_token
     and accepted_at is null
  returning offer_id into v_offer_id;

  v_updated := found;

  if v_updated and v_offer_id is not null then
    update public.contractor_offers
       set status = 'accepted'
     where id = v_offer_id;
  end if;

  select jsonb_build_object(
           'accepted_at', accepted_at,
           'accepted_by_name', accepted_by_name
         )
    into v_result
    from public.shared_offers
   where id = p_token;

  return v_result; -- null, wenn der Token unbekannt ist
end;
$$;

revoke all on function public.accept_shared_offer(uuid, text) from public;
grant execute on function public.accept_shared_offer(uuid, text) to anon, authenticated;
