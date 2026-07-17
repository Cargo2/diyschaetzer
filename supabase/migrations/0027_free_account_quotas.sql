-- Missbrauchsschutz: serverseitige Mengen-Quotas gegen Massen-Anlage
--
-- Ziel ist AUSSCHLIESSLICH Missbrauchsschutz (Bot-/Skript-getriebene Massen-Anlage
-- durch Free-Konten), KEINE Produkt-Limits. Die Caps sind so großzügig gewählt, dass
-- normale Nutzer sie nie erreichen -> das Frontend braucht keine Sonderbehandlung, der
-- generische Fehlerpfad ("Speichern fehlgeschlagen") reicht.
--
-- Muster (analog enforce_offer_limit 0020): EINE generische BEFORE-INSERT-Trigger-
-- funktion, SECURITY DEFINER mit fixem search_path (damit der COUNT nicht an RLS
-- scheitert), die pro Tabelle über TG_ARGV die Caps und optional den Tages-Modus
-- erhält. Premium (aktives Lead-Abo) bekommt den höheren Cap; Admins sind ausgenommen.
--
-- WICHTIG – NUR Tabellen mit direktem Client-Schreibzugriff (RLS-Insert durch
-- authenticated/anon) bekommen einen Trigger. Bewusst NICHT gebremst, weil nur per
-- service_role/Edge Function beschrieben (kein Client-Insert-Pfad):
--   * leads (0018)              -> `revoke all` für anon/authenticated; Insert nur in
--                                  der Edge Function `lead-submit` (service_role).
--                                  Zudem hat `leads` KEIN owner_id (anonyme Endkunden-
--                                  Absendungen) -> ein Per-Owner-Cap wäre sinnlos; das
--                                  Rate-Limit (3/24 h je E-Mail-Hash) lebt in der Edge
--                                  Function über `submit_count_key`.
--   * lead_assignments (0018)   -> `revoke all`; nur Admin-RPC/service_role.
--   * subscriptions,
--     subscription_events (0019)-> `revoke all`; nur PayPal-Webhook/service_role.
--   * profiles (0001/0002)      -> genau eine Zeile je Nutzer (PK = auth.uid()),
--                                  Self-Insert nur der eigenen id -> strukturell 1:1.
--   * rooms (0001/0002)         -> client-schreibbar, aber transitiv durch den
--                                  projects-Cap begrenzt (Räume hängen am Projekt) und
--                                  ohne owner_id-Spalte -> hier bewusst nicht gebremst.

-- ---------------------------------------------------------------------------
-- Generische Quota-Trigger-Funktion.
--   TG_ARGV[0] = Free-Cap (integer, als text)
--   TG_ARGV[1] = Premium-Cap (integer, als text)
--   TG_ARGV[2] = optional 'daily' -> zählt nur die heutigen Zeilen (created_at::date)
-- Setzt voraus, dass die Trigger-Tabelle eine Spalte owner_id besitzt (und bei 'daily'
-- zusätzlich created_at). Der COUNT läuft dank SECURITY DEFINER an RLS vorbei.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_owner_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free    integer := (TG_ARGV[0])::integer;
  v_premium integer := (TG_ARGV[1])::integer;
  v_daily   boolean := coalesce(TG_ARGV[2], '') = 'daily';
  v_cap     integer;
  v_count   integer;
begin
  -- Admins sind vom Missbrauchs-Cap ausgenommen (is_admin() aus 0010).
  if public.is_admin() then
    return new;
  end if;

  -- Premium (aktives Lead-Abo, has_active_lead_subscription() aus 0019) -> höherer Cap.
  if public.has_active_lead_subscription(new.owner_id) then
    v_cap := v_premium;
  else
    v_cap := v_free;
  end if;

  if v_daily then
    execute format(
      'select count(*) from public.%I where owner_id = $1 and created_at::date = current_date',
      TG_TABLE_NAME
    ) into v_count using new.owner_id;
  else
    execute format(
      'select count(*) from public.%I where owner_id = $1',
      TG_TABLE_NAME
    ) into v_count using new.owner_id;
  end if;

  if v_count >= v_cap then
    raise exception 'quota_exceeded: %', TG_TABLE_NAME
      using hint = 'Missbrauchsschutz: maximale Anzahl je Konto erreicht.';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger je client-schreibbarer, owner-scoped Tabelle (idempotent: drop + create).
-- ---------------------------------------------------------------------------

-- projects (0001/0002): Insert nur owner (projects_insert_own).
drop trigger if exists projects_enforce_quota on public.projects;
create trigger projects_enforce_quota
  before insert on public.projects
  for each row execute function public.enforce_owner_quota('30', '100');

-- contractor_offers (0008/0016): Insert nur owner (contractor_offers_insert_own).
-- Hinweis: enforce_offer_limit (0020) deckelt Free-Konten bereits produktseitig auf 3
-- (Premium unbegrenzt). Dieser Cap ist die ergänzende Missbrauchs-Obergrenze – für
-- Free-Konten greift praktisch weiter das 3er-Produktlimit, dieser Cap zieht die sonst
-- unbegrenzten Premium-Konten bei 500 ab. Beide BEFORE-Trigger feuern (alphabetisch
-- zuerst _enforce_quota, dann _limit) und ergänzen sich konfliktfrei.
drop trigger if exists contractor_offers_enforce_quota on public.contractor_offers;
create trigger contractor_offers_enforce_quota
  before insert on public.contractor_offers
  for each row execute function public.enforce_owner_quota('100', '500');

-- contractor_snippets (0025): Insert nur owner (contractor_snippets_insert_own).
drop trigger if exists contractor_snippets_enforce_quota on public.contractor_snippets;
create trigger contractor_snippets_enforce_quota
  before insert on public.contractor_snippets
  for each row execute function public.enforce_owner_quota('100', '300');

-- shared_offers (0017/0024): Insert nur owner (shared_offers_insert_own).
drop trigger if exists shared_offers_enforce_quota on public.shared_offers;
create trigger shared_offers_enforce_quota
  before insert on public.shared_offers
  for each row execute function public.enforce_owner_quota('50', '300');

-- shared_calculations (0009): Insert nur owner (shared_calculations_insert_own).
-- Kein eigener Premium-Vorteil nötig -> Free-Cap = Premium-Cap.
drop trigger if exists shared_calculations_enforce_quota on public.shared_calculations;
create trigger shared_calculations_enforce_quota
  before insert on public.shared_calculations
  for each row execute function public.enforce_owner_quota('50', '50');

-- contractor_feedback (0014): Insert nur eigene Zeile durch Profis
-- (contractor_feedback_insert_own_contractor). Anti-Spam als TAGES-Cap (created_at::date).
drop trigger if exists contractor_feedback_enforce_quota on public.contractor_feedback;
create trigger contractor_feedback_enforce_quota
  before insert on public.contractor_feedback
  for each row execute function public.enforce_owner_quota('10', '10', 'daily');

-- contractor_invoices (0021): Insert nur owner, client-schreibbar; unique(owner_id,
-- invoice_number) bremst Massen-Anlage nur teilweise -> gleicher Missbrauchs-Cap wie
-- contractor_offers.
drop trigger if exists contractor_invoices_enforce_quota on public.contractor_invoices;
create trigger contractor_invoices_enforce_quota
  before insert on public.contractor_invoices
  for each row execute function public.enforce_owner_quota('100', '500');
