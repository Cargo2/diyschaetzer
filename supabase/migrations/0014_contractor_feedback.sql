-- Phase 13 (Profi-Modus) – Profi-Feedback: Verbesserungsvorschläge von Profis
--
-- Ein Eintrag = eine Feedback-Nachricht eines angemeldeten Profis (contractor).
-- Owner-scoped beim Schreiben (jeder legt nur eigene Zeilen an, nur wenn er
-- wirklich Profi ist). Lesen NICHT über eine permissive RLS-Policy, sondern –
-- wie bei der Admin-Nutzerübersicht (Migration 0013) – über eine SECURITY
-- DEFINER-Funktion, die nur Admins die gesammelten Nachrichten zurückgibt.

create table if not exists public.contractor_feedback (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  category   text not null,
  message    text not null check (char_length(message) between 1 and 4000),
  status     text not null default 'new' check (status in ('new', 'read')),
  created_at timestamptz not null default now()
);

create index if not exists contractor_feedback_created_at_idx
  on public.contractor_feedback (created_at desc);

alter table public.contractor_feedback enable row level security;

-- Anlegen: nur die eigene Zeile UND nur, wenn der Nutzer Profi ist. Der EXISTS
-- prüft die eigene profiles-Zeile (unter der profiles-Select-own-Policy lesbar,
-- keine Rekursion, da Policy auf einer anderen Tabelle). Kein SELECT/UPDATE/DELETE
-- für normale Nutzer: gespeicherte Nachrichten sieht nur der Admin (s. u.).
create policy "contractor_feedback_insert_own_contractor"
  on public.contractor_feedback for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'contractor'
    )
  );

-- Admin-Lesezugriff: alle Nachrichten inkl. Absender-E-Mail. Nur für Admins
-- (sonst leere Menge). Fixer search_path als Härtung.
create or replace function public.admin_list_feedback()
returns table (
  id         uuid,
  email      text,
  category   text,
  message    text,
  status     text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, u.email::text, f.category, f.message, f.status, f.created_at
  from public.contractor_feedback f
  join auth.users u on u.id = f.owner_id
  where public.is_admin()
  order by f.created_at desc;
$$;

revoke all on function public.admin_list_feedback() from public;
grant execute on function public.admin_list_feedback() to authenticated;

-- Admin-Schreibpfad: Status setzen (new/read). Nur Admins; ungültige Werte werden
-- abgewiesen. Kontrollierter Schreibzugriff statt permissiver UPDATE-Policy.
create or replace function public.admin_set_feedback_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('new', 'read') then
    raise exception 'invalid status %', p_status;
  end if;
  update public.contractor_feedback set status = p_status where id = p_id;
end;
$$;

revoke all on function public.admin_set_feedback_status(uuid, text) from public;
grant execute on function public.admin_set_feedback_status(uuid, text) to authenticated;
