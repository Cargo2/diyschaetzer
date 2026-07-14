-- M8 Lead-Funnel (docs/m8-spec.md). DSGVO-Kernstück:
-- * leads hat RLS OHNE Policies für anon/authenticated -> nur service_role (Edge Function).
-- * Bestätigung ausschließlich über confirm_lead(token); Token ist das einzige Geheimnis.
-- * Zuteilung an maximal 3 Betriebe (Nutzerentscheidung 11.07.2026).
-- * Unbestätigte Leads werden nach 7 Tagen gelöscht (pg_cron).

create extension if not exists pgcrypto;

-- ── Tabellen ────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  name               text not null,
  postal_code        text not null check (postal_code ~ '^[0-9]{5}$'),
  email              text not null check (position('@' in email) > 1),
  phone              text,
  timeframe          text not null check (timeframe in ('asap','1_3_months','3_6_months','open')),
  message            text,
  project_snapshot   jsonb not null default '{}'::jsonb,
  consent_text       text not null,
  consent_version    text not null,
  consent_at         timestamptz not null,
  status             text not null default 'pending_confirmation'
                     check (status in ('pending_confirmation','confirmed','distributed','expired')),
  confirmation_token text unique,
  confirmed_at       timestamptz,
  -- Hash der E-Mail fürs Rate-Limit (kein Klartext-Index nötig)
  submit_count_key   text not null
);

alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;

create index if not exists leads_status_created_idx on public.leads (status, created_at);
create index if not exists leads_submit_key_idx on public.leads (submit_count_key, created_at);

create table if not exists public.lead_assignments (
  lead_id       uuid not null references public.leads (id) on delete cascade,
  contractor_id uuid not null references public.profiles (id) on delete cascade,
  assigned_at   timestamptz not null default now(),
  primary key (lead_id, contractor_id)
);

alter table public.lead_assignments enable row level security;
revoke all on public.lead_assignments from anon, authenticated;

-- ── Firmenprofil: Lead-Empfangsdaten (additiv) ─────────────────────────────
-- lead_room_types: gewünschte Raum-/Projektarten des Betriebs. Werte-Domäne =
-- RoomType (src/app/models/bathroom-wizard.model.ts): 'bathroom','guest_wc',
-- 'kitchen','hallway','living_area','basement','utility_room','terrace_balcony','other'.
alter table public.company_profiles
  add column if not exists lead_zip_areas       text[]  not null default '{}',
  add column if not exists lead_room_types      text[]  not null default '{}',
  add column if not exists lead_max_per_month   integer not null default 5,
  add column if not exists lead_contact_channel text    not null default 'email'
    check (lead_contact_channel in ('email','phone')),
  add column if not exists leads_active         boolean not null default false;

-- ── Bestätigung (Double-Opt-in) ────────────────────────────────────────────
create or replace function public.confirm_lead(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or length(p_token) < 32 then
    return false;
  end if;
  update public.leads
     set status = 'confirmed',
         confirmed_at = now(),
         confirmation_token = null
   where confirmation_token = p_token
     and status = 'pending_confirmation';
  return found;
end;
$$;

grant execute on function public.confirm_lead(text) to anon, authenticated;

-- ── Admin-Funktionen (is_admin()-gated, Muster 0013/0014) ──────────────────
create or replace function public.admin_list_leads()
returns table (
  id uuid, created_at timestamptz, name text, postal_code text, email text,
  phone text, timeframe text, message text, project_snapshot jsonb,
  consent_version text, consent_at timestamptz, status text,
  confirmed_at timestamptz, assigned_contractor_ids uuid[]
)
language sql
security definer
set search_path = public
as $$
  select l.id, l.created_at, l.name, l.postal_code, l.email, l.phone, l.timeframe,
         l.message, l.project_snapshot, l.consent_version, l.consent_at, l.status,
         l.confirmed_at,
         coalesce(array_agg(a.contractor_id) filter (where a.contractor_id is not null), '{}')
    from public.leads l
    left join public.lead_assignments a on a.lead_id = l.id
   where public.is_admin()
   group by l.id
   order by l.created_at desc;
$$;

create or replace function public.admin_set_lead_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_status not in ('pending_confirmation','confirmed','distributed','expired') then
    raise exception 'invalid status';
  end if;
  update public.leads set status = p_status where id = p_id;
end;
$$;

create or replace function public.admin_delete_lead(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  delete from public.leads where id = p_id;
end;
$$;

create or replace function public.admin_assign_lead(p_lead_id uuid, p_contractor_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_contractor_ids is null or array_length(p_contractor_ids, 1) is null then
    raise exception 'no contractors given';
  end if;
  -- Nutzerentscheidung + Einwilligungstext: maximal 3 Betriebe je Lead.
  if array_length(p_contractor_ids, 1) > 3 then
    raise exception 'max 3 contractors per lead (consent limit)';
  end if;
  select count(*) into v_count
    from public.profiles
   where id = any (p_contractor_ids) and role = 'contractor';
  if v_count <> array_length(p_contractor_ids, 1) then
    raise exception 'all recipients must be contractors';
  end if;
  if not exists (
    select 1 from public.leads
     where id = p_lead_id and status in ('confirmed','distributed')
  ) then
    raise exception 'lead must be confirmed before distribution';
  end if;

  delete from public.lead_assignments where lead_id = p_lead_id;
  insert into public.lead_assignments (lead_id, contractor_id)
  select p_lead_id, unnest(p_contractor_ids);
  update public.leads set status = 'distributed' where id = p_lead_id;
end;
$$;

grant execute on function public.admin_list_leads() to authenticated;
grant execute on function public.admin_set_lead_status(uuid, text) to authenticated;
grant execute on function public.admin_delete_lead(uuid) to authenticated;
grant execute on function public.admin_assign_lead(uuid, uuid[]) to authenticated;

-- ── Contractor: sieht AUSSCHLIESSLICH ihm zugeteilte, weitergegebene Leads ──
create or replace function public.contractor_list_assigned_leads()
returns table (
  id uuid, assigned_at timestamptz, name text, postal_code text, email text,
  phone text, timeframe text, message text, project_snapshot jsonb
)
language sql
security definer
set search_path = public
as $$
  select l.id, a.assigned_at, l.name, l.postal_code, l.email, l.phone,
         l.timeframe, l.message, l.project_snapshot
    from public.lead_assignments a
    join public.leads l on l.id = a.lead_id
   where a.contractor_id = auth.uid()
     and l.status = 'distributed'
   order by a.assigned_at desc;
$$;

grant execute on function public.contractor_list_assigned_leads() to authenticated;

-- ── Löschfrist: unbestätigte Leads nach 7 Tagen löschen ────────────────────
create or replace function public.cleanup_expired_leads()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.leads
   where status = 'pending_confirmation'
     and created_at < now() - interval '7 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- pg_cron ist auf Supabase verfügbar; falls nicht (lokal), Migration nicht abbrechen.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('cleanup-expired-leads', '0 3 * * *',
                        $job$select public.cleanup_expired_leads();$job$);
exception when others then
  raise notice 'pg_cron nicht verfügbar – cleanup_expired_leads() manuell/extern planen (%).', sqlerrm;
end;
$$;
