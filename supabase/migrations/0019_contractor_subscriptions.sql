-- M11 Contractor-Abo (docs/m11-contractor-abo-spec.md), Provider PayPal.
-- Abo-Status ist SERVER-Wahrheit: Schreiben ausschließlich über Edge Functions
-- (service_role); Contractor liest nur die eigene Zeile. Lead-Zuteilung wird
-- hart auf aktive Abos gegated (Grace-Period 3 Tage).

create table if not exists public.subscriptions (
  user_id                  uuid primary key references public.profiles (id) on delete cascade,
  provider                 text not null check (provider in ('paypal','stripe')),
  provider_customer_id     text,
  provider_subscription_id text not null unique,
  plan_key                 text not null default 'lead_pro',
  status                   text not null check (status in
                           ('active','trialing','past_due','cancelled','expired')),
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

-- Contractor liest ausschließlich die eigene Abo-Zeile.
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- Webhook-Idempotenz: jedes PayPal-Event nur einmal verarbeiten.
create table if not exists public.subscription_events (
  event_id     text primary key,
  received_at  timestamptz not null default now()
);
alter table public.subscription_events enable row level security;
revoke all on public.subscription_events from anon, authenticated;

create or replace function public.has_active_lead_subscription(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
     where s.user_id = p_user
       and s.status in ('active','trialing')
       and (s.current_period_end is null
            or s.current_period_end + interval '3 days' > now())
  );
$$;

grant execute on function public.has_active_lead_subscription(uuid) to authenticated;

-- Admin: Abo-Status aller Contractors (für den Zuteilen-Dialog).
create or replace function public.admin_list_subscriptions()
returns table (user_id uuid, provider text, plan_key text, status text,
               current_period_end timestamptz, active boolean)
language sql
security definer
set search_path = public
as $$
  select s.user_id, s.provider, s.plan_key, s.status, s.current_period_end,
         public.has_active_lead_subscription(s.user_id)
    from public.subscriptions s
   where public.is_admin();
$$;

grant execute on function public.admin_list_subscriptions() to authenticated;

-- Lead-Zuteilung: nur an Betriebe mit aktivem Abo (M11-Gate zusätzlich zu max. 3).
create or replace function public.admin_assign_lead(p_lead_id uuid, p_contractor_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_no_sub uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_contractor_ids is null or array_length(p_contractor_ids, 1) is null then
    raise exception 'no contractors given';
  end if;
  if array_length(p_contractor_ids, 1) > 3 then
    raise exception 'max 3 contractors per lead (consent limit)';
  end if;
  select count(*) into v_count
    from public.profiles
   where id = any (p_contractor_ids) and role = 'contractor';
  if v_count <> array_length(p_contractor_ids, 1) then
    raise exception 'all recipients must be contractors';
  end if;
  select c into v_no_sub
    from unnest(p_contractor_ids) as c
   where not public.has_active_lead_subscription(c)
   limit 1;
  if v_no_sub is not null then
    raise exception 'contractor % has no active lead subscription', v_no_sub;
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
