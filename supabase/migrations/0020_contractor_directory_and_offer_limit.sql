-- Nutzerauftrag 12.07.2026 (Lead-Modus-Ausbau, dokumentiert in
-- docs/lead-modul-portierung.md):
-- 1) Öffentliches Betriebe-Verzeichnis nach PLZ: Interessenten geben am Ende des
--    Schätzers ihre PLZ ein und sehen passende AKTIVE Premium-Betriebe als Kacheln.
--    Sichtbar sind NUR Marketing-Felder von Betrieben mit aktivem Abo + leads_active
--    (= Teil des Premium-Versprechens "Anzeige deiner Daten in der Region").
-- 2) Angebots-Limit: ohne aktives Abo maximal 3 gespeicherte Angebote/Versionen
--    (serverseitig erzwungen; UI bietet Löschen-zum-Anlegen an).

-- ── 1) Verzeichnis-Funktion (anon-callbar, SECURITY DEFINER) ────────────────
create or replace function public.list_active_contractors(p_postal_code text)
returns table (
  company_name text, city text, phone text, website text,
  lead_room_types text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select cp.company_name, cp.city, cp.phone, cp.website, cp.lead_room_types
    from public.company_profiles cp
   where cp.leads_active
     and cp.company_name <> ''
     and public.has_active_lead_subscription(cp.id)
     -- PLZ-Match: hinterlegte Gebiete sind Präfixe (z. B. '20', '201', '20095').
     and exists (
       select 1 from unnest(cp.lead_zip_areas) as area
        where area <> '' and p_postal_code like area || '%'
     )
   order by cp.company_name
   limit 12;
$$;

grant execute on function public.list_active_contractors(text) to anon, authenticated;

-- ── 2) Angebots-Limit für Nicht-Premium (max. 3 gespeicherte Angebote) ─────
-- Zielschema (Migration 0016): contractor_offers hat eigenen PK `id` und Spalte
-- `version` – ein Owner kann mehrere Angebote/Versionen halten. Das Limit zählt
-- alle gespeicherten Zeilen (inkl. Versionen) je owner_id.
create or replace function public.enforce_offer_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_active_lead_subscription(new.owner_id)
     and (select count(*) from public.contractor_offers
           where owner_id = new.owner_id) >= 3 then
    raise exception 'offer_limit_reached'
      using hint = 'Ohne Premium-Abo sind maximal 3 gespeicherte Angebote möglich.';
  end if;
  return new;
end;
$$;

drop trigger if exists contractor_offers_limit on public.contractor_offers;
create trigger contractor_offers_limit
  before insert on public.contractor_offers
  for each row execute function public.enforce_offer_limit();
