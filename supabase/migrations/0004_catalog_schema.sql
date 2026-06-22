-- Phase 12 (Rest) – Katalog/Offers in die DB: Schema + öffentliche Read-RLS
--
-- Grundsatz: Der Materialkatalog ist öffentliche Produktdaten. Die App zeigt
-- Materiallisten auch anonym (ohne Login) an → SELECT für alle. Geschrieben wird
-- nur über service_role (Seed/Admin), das RLS umgeht; daher gibt es bewusst
-- KEINE insert/update/delete-Policies für anon/authenticated.
--
-- Die DB ist ab hier die Laufzeitquelle; der TS-Katalog
-- (material-catalog-with-prices.ts, product-offers.ts) ist nur noch Seed
-- (siehe Migration 0005) und Offline-Fallback im Frontend.

-- ---------------------------------------------------------------------------
-- work_steps: Arbeitsschritte (klein, einfache Skalare)
-- ---------------------------------------------------------------------------
create table if not exists public.work_steps (
  id          text primary key,
  "order"     integer not null,
  label       text not null,
  description text not null
);

-- ---------------------------------------------------------------------------
-- materials: ein Katalogartikel je Zeile. Das vollständige, verschachtelte
-- MaterialCatalogItem bleibt als jsonb-Blob erhalten (verlustfrei, wie rooms.wizard_data).
-- ---------------------------------------------------------------------------
create table if not exists public.materials (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- product_offers: Affiliate-Angebote je Material (relational, n je Material).
-- Passt zur späteren Admin-Pflege (Phase 15).
-- ---------------------------------------------------------------------------
create table if not exists public.product_offers (
  id            uuid primary key default gen_random_uuid(),
  material_id   text not null references public.materials (id) on delete cascade,
  merchant_id   text not null,
  type          text not null check (type in ('product', 'search')),
  affiliate_url text,
  active        boolean not null default true,
  checked_at    date,
  created_at    timestamptz not null default now()
);

create index if not exists product_offers_material_id_idx
  on public.product_offers (material_id);

-- updated_at für materials automatisch pflegen (Funktion aus 0001 wiederverwenden)
drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: öffentlich lesbar, kein Schreibzugriff für anon/authenticated
-- ---------------------------------------------------------------------------
alter table public.work_steps     enable row level security;
alter table public.materials      enable row level security;
alter table public.product_offers enable row level security;

create policy "work_steps_public_read"
  on public.work_steps for select using (true);

create policy "materials_public_read"
  on public.materials for select using (true);

create policy "product_offers_public_read"
  on public.product_offers for select using (true);
