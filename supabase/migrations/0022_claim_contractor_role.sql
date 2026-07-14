-- WP3 – Einmaliger Rollen-Anspruch für Google-OAuth-Profis
--
-- Hintergrund: Bei der Google-Registrierung liefert Supabase KEIN role-Metadatum
-- (raw_user_meta_data ohne 'role'-Key). handle_new_user() (0002) legt das Profil
-- daher als 'customer' an, und protect_profile_role_plan() (0003) friert role/plan
-- anschließend ein. Ein Nutzer, der sich BEWUSST als Betrieb per Google registriert,
-- braucht deshalb einen engen, EINMALIGEN Upgrade-Pfad customer→contractor.
--
-- Das ist KEINE Privileg-Eskalation: 'contractor' ist bei der E-Mail-Registrierung
-- ohnehin frei wählbar (0002). Weiterhin geschützt bleiben 'admin' und der 'plan'
-- (0003 verhält sich für alle anderen Fälle unverändert).

create or replace function public.claim_contractor_role()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Es muss ein angemeldeter Nutzer sein.
  if auth.uid() is null then
    raise exception 'Kein angemeldeter Nutzer.';
  end if;

  -- 2. Das Profil muss existieren und der unveränderte Standard 'customer'/'free' sein.
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'customer' and plan = 'free'
  ) then
    raise exception 'Rollen-Upgrade nur für unveränderte Heimwerker-Konten möglich.';
  end if;

  -- 3. Nur frisch registrierte Konten (15-Minuten-Fenster ab created_at).
  if not exists (
    select 1 from auth.users
    where id = auth.uid()
      and created_at > now() - interval '15 minutes'
  ) then
    raise exception 'Das Zeitfenster für die Rollenwahl ist abgelaufen.';
  end if;

  -- 4. Nur echte OAuth-Signups OHNE role-Metadatum. Wer sich per E-Mail bewusst als
  --    'customer' registriert hat, darf diese Wahl hier NICHT nachträglich umgehen.
  if exists (
    select 1 from auth.users
    where id = auth.uid()
      and (raw_user_meta_data ? 'role')
  ) then
    raise exception 'Für dieses Konto wurde bereits eine Rolle festgelegt.';
  end if;

  -- Transaktionslokales Flag (dritter Parameter true = local): erlaubt dem
  -- BEFORE-UPDATE-Trigger protect_profile_role_plan() genau DIESEN einen Upgrade
  -- customer→contractor. Gilt nur innerhalb dieser Transaktion.
  perform set_config('app.allow_role_upgrade', 'on', true);
  update public.profiles set role = 'contractor' where id = auth.uid();
end;
$$;

-- protect_profile_role_plan() aus 0003 übernommen und MINIMAL erweitert: ein eng
-- gefasster erlaubter Zweig VOR dem bisherigen Zurücksetzen-Branch. Alles andere
-- bleibt identisch zu 0003.
create or replace function public.protect_profile_role_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Kein angemeldeter Nutzer-Kontext: service_role / direkter Admin-Zugriff /
  -- Registrierungs-Trigger -> Änderung an role/plan zulassen.
  if auth.uid() is null then
    return new;
  end if;

  -- Angemeldeter Admin darf role/plan ändern.
  if exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    return new;
  end if;

  -- Einmaliger Rollen-Anspruch (claim_contractor_role): NUR customer→contractor,
  -- und der plan wird ERZWUNGEN vom alten Wert übernommen (sonst wäre über diesen
  -- Zweig ein Plan-Eskalations-Loch offen).
  if current_setting('app.allow_role_upgrade', true) = 'on'
     and old.role = 'customer'
     and new.role = 'contractor' then
    new.plan := old.plan;
    return new;
  end if;

  -- Sonst: role/plan sind unveränderlich -> auf die alten Werte zurücksetzen.
  new.role := old.role;
  new.plan := old.plan;
  return new;
end;
$$;

-- Trigger neu binden (idempotent, Verhalten wie 0003).
drop trigger if exists profiles_protect_role_plan on public.profiles;

create trigger profiles_protect_role_plan
  before update on public.profiles
  for each row execute function public.protect_profile_role_plan();

-- Nur angemeldete Nutzer dürfen den Anspruch überhaupt auslösen.
revoke execute on function public.claim_contractor_role() from public, anon;
grant execute on function public.claim_contractor_role() to authenticated;
