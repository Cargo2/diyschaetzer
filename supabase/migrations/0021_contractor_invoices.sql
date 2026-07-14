-- M12: Rechnungen aus Angeboten (docs/m12-rechnungen-spec.md).
-- Muster = contractor_offers (0008/0016): owner-scoped RLS, jsonb-Blob.
-- unique (owner_id, invoice_number) erzwingt fortlaufend-einmalige Nummern (§ 14 UStG).
-- KEIN Limit-Trigger auf Rechnungen (bewusste Entscheidung); der Angebots-Limit-Trigger
-- enforce_offer_limit (0020) hängt nur an contractor_offers und lässt diese Tabelle unberührt.

create table if not exists public.contractor_invoices (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users (id) on delete cascade,
  project_id     uuid,
  offer_id       uuid,
  invoice_number text not null,
  invoice_data   jsonb not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (owner_id, invoice_number)
);

create index if not exists contractor_invoices_owner_idx
  on public.contractor_invoices (owner_id, created_at desc);

alter table public.contractor_invoices enable row level security;

create policy contractor_invoices_select_own on public.contractor_invoices
  for select to authenticated using (auth.uid() = owner_id);
create policy contractor_invoices_insert_own on public.contractor_invoices
  for insert to authenticated with check (auth.uid() = owner_id);
create policy contractor_invoices_update_own on public.contractor_invoices
  for update to authenticated using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
create policy contractor_invoices_delete_own on public.contractor_invoices
  for delete to authenticated using (auth.uid() = owner_id);

-- updated_at automatisch pflegen (Funktion aus 0001 wiederverwenden).
drop trigger if exists contractor_invoices_set_updated_at on public.contractor_invoices;
create trigger contractor_invoices_set_updated_at
  before update on public.contractor_invoices
  for each row execute function public.set_updated_at();

-- Zahlungs-/Steuerdaten des Betriebs für Rechnung + XRechnung (additiv).
alter table public.company_profiles
  add column if not exists tax_number text not null default '',
  add column if not exists iban       text not null default '',
  add column if not exists bic        text not null default '',
  add column if not exists bank_name  text not null default '';
