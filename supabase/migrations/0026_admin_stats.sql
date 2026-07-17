-- Phase 19+ – Admin-Statistik-Dashboard + überarbeitete Abo-Übersicht
--
-- Zwei is_admin()-gated SECURITY DEFINER-Funktionen (Muster 0013/0014/0019):
--   1. admin_get_stats()          – EIN jsonb mit Kennzahlen für die Admin-Startseite.
--   2. admin_list_subscriptions() – Abo-Liste, hier um E-Mail + created_at ERWEITERT.
--
-- Beide sind streng is_admin()-gated (Exception bzw. leere Menge für Nicht-Admins),
-- `security definer set search_path = public` als Härtung, EXECUTE nur für authenticated.
-- Rollenvergabe bleibt unverändert serverseitig; hier gibt es keinen Schreibpfad.

-- ---------------------------------------------------------------------------
-- 1. admin_get_stats(): aggregierte Kennzahlen als jsonb.
--
-- Nur zählende Selects (keine Writes). Wirft für Nicht-Admins eine Exception
-- (wie admin_set_feedback_status/0014), statt still leer zu liefern – das
-- Dashboard soll den fehlenden Zugriff sichtbar machen. Die Kennzahlen sind an
-- den real existierenden Tabellen/Spalten ausgerichtet (0001/0008/0016/0017/0018/
-- 0019/0021/0024). Trend-Zahlen (30/7 Tage) nur dort, wo ein created_at existiert.
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    -- Nutzer (profiles + auth.users.created_at)
    'users_total',        (select count(*) from public.profiles),
    'users_customer',     (select count(*) from public.profiles where role = 'customer'),
    'users_contractor',   (select count(*) from public.profiles where role = 'contractor'),
    'users_admin',        (select count(*) from public.profiles where role = 'admin'),
    'users_new_30d',      (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'users_new_7d',       (select count(*) from auth.users where created_at >= now() - interval '7 days'),

    -- Abos (subscriptions)
    'subs_total',         (select count(*) from public.subscriptions),
    'subs_active',        (select count(*) from public.subscriptions where status in ('active', 'trialing')),
    'subs_past_due',      (select count(*) from public.subscriptions where status = 'past_due'),
    'subs_cancelled',     (select count(*) from public.subscriptions where status in ('cancelled', 'expired')),

    -- Projekte (projects)
    'projects_total',     (select count(*) from public.projects),
    'projects_new_30d',   (select count(*) from public.projects where created_at >= now() - interval '30 days'),
    'projects_active_30d',(select count(*) from public.projects where updated_at >= now() - interval '30 days'),

    -- Angebote (contractor_offers, Status aus 0016)
    'offers_total',       (select count(*) from public.contractor_offers),
    'offers_draft',       (select count(*) from public.contractor_offers where status = 'draft'),
    'offers_sent',        (select count(*) from public.contractor_offers where status = 'sent'),
    'offers_accepted',    (select count(*) from public.contractor_offers where status = 'accepted'),

    -- Rechnungen (contractor_invoices, 0021)
    'invoices_total',     (select count(*) from public.contractor_invoices),
    'invoices_new_30d',   (select count(*) from public.contractor_invoices where created_at >= now() - interval '30 days'),

    -- Geteilte Angebote (shared_offers + Tracking aus 0024)
    'shared_offers_total',    (select count(*) from public.shared_offers),
    'shared_offers_viewed',   (select count(*) from public.shared_offers where viewed_at is not null),
    'shared_offers_view_sum', (select coalesce(sum(view_count), 0) from public.shared_offers),
    'shared_offers_accepted', (select count(*) from public.shared_offers where accepted_at is not null),

    -- Geteilte Kalkulationen (shared_calculations, 0009)
    'shared_calculations_total', (select count(*) from public.shared_calculations),

    -- Leads nach Status (leads, 0018)
    'leads_total',        (select count(*) from public.leads),
    'leads_pending',      (select count(*) from public.leads where status = 'pending_confirmation'),
    'leads_confirmed',    (select count(*) from public.leads where status = 'confirmed'),
    'leads_distributed',  (select count(*) from public.leads where status = 'distributed'),
    'leads_expired',      (select count(*) from public.leads where status = 'expired'),

    -- Feedback (contractor_feedback, 0014)
    'feedback_total',     (select count(*) from public.contractor_feedback),
    'feedback_open',      (select count(*) from public.contractor_feedback where status = 'new')
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_get_stats() from public;
grant execute on function public.admin_get_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. admin_list_subscriptions(): überarbeitete Version für die Abo-Übersicht.
--
-- Die Version aus 0019 lieferte nur user_id/provider/plan_key/status/
-- current_period_end/active – für eine Abo-Seite fehlten E-Mail und Anlagedatum.
-- Da sich der RÜCKGABETYP ändert (zusätzliche Spalten email, created_at), muss die
-- Funktion vor dem Neuanlegen DROPpt werden (CREATE OR REPLACE allein kann den
-- Rückgabetyp einer table-Funktion nicht ändern). Die bestehende Repo-Schicht liest
-- weiterhin ihre Teilmenge der Spalten – zusätzliche Spalten stören dort nicht.
-- ---------------------------------------------------------------------------
drop function if exists public.admin_list_subscriptions();

create function public.admin_list_subscriptions()
returns table (
  user_id            uuid,
  email              text,
  provider           text,
  plan_key           text,
  status             text,
  current_period_end timestamptz,
  created_at         timestamptz,
  active             boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select s.user_id,
         u.email::text,
         s.provider,
         s.plan_key,
         s.status,
         s.current_period_end,
         s.created_at,
         public.has_active_lead_subscription(s.user_id)
    from public.subscriptions s
    join auth.users u on u.id = s.user_id
   where public.is_admin()
   -- Sortierung: aktive/trialing zuerst, dann past_due, dann beendete;
   -- innerhalb einer Gruppe nach Periodenende (jüngstes zuerst).
   order by
     case s.status
       when 'active'    then 0
       when 'trialing'  then 1
       when 'past_due'  then 2
       when 'cancelled' then 3
       when 'expired'   then 4
       else 5
     end,
     s.current_period_end desc nulls last;
$$;

revoke all on function public.admin_list_subscriptions() from public;
grant execute on function public.admin_list_subscriptions() to authenticated;
