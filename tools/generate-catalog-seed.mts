/**
 * Generiert aus dem TS-Seed (material-catalog-with-prices.ts, product-offers.ts)
 * die idempotente Seed-Migration supabase/migrations/0005_seed_catalog.sql.
 *
 * Ausführen:  npx tsx tools/generate-catalog-seed.mts
 *
 * Der TS-Katalog ist ab Phase 12 nur noch Seed (und Offline-Fallback im
 * Frontend). Bei Katalog-Änderungen dieses Skript erneut laufen lassen und die
 * erzeugte Migration anwenden – bis die Pflege (Phase 15) in die DB/Admin-UI wandert.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATERIAL_CATALOG, WORK_STEPS } from '../src/app/data/material-catalog-with-prices';
import { PRODUCT_OFFERS } from '../src/app/data/product-offers';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../supabase/migrations/0005_seed_catalog.sql');

const str = (value: string | null | undefined): string =>
  value === null || value === undefined ? 'null' : `'${value.replace(/'/g, "''")}'`;
const bool = (value: boolean): string => (value ? 'true' : 'false');
const int = (value: number): string => String(value);
const json = (value: unknown): string => `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;

const lines: string[] = [];
lines.push('-- AUTO-GENERIERT von tools/generate-catalog-seed.mts – NICHT von Hand bearbeiten.');
lines.push('-- Quelle: src/app/data/material-catalog-with-prices.ts + product-offers.ts');
lines.push('-- Idempotent: kann beliebig oft angewendet werden (upsert bzw. delete+insert).');
lines.push('');
lines.push('begin;');
lines.push('');

// --- work_steps ------------------------------------------------------------
lines.push('-- work_steps');
lines.push('insert into public.work_steps (id, "order", label, description) values');
lines.push(
  WORK_STEPS.map(
    (s) => `  (${str(s.id)}, ${int(s.order)}, ${str(s.label)}, ${str(s.description)})`
  ).join(',\n') + ''
);
lines.push(
  'on conflict (id) do update set "order" = excluded."order", label = excluded.label, description = excluded.description;'
);
lines.push('');

// --- materials -------------------------------------------------------------
lines.push('-- materials (vollständiges MaterialCatalogItem als jsonb)');
lines.push('insert into public.materials (id, data) values');
lines.push(
  MATERIAL_CATALOG.map((m) => `  (${str(m.id)}, ${json(m)})`).join(',\n')
);
lines.push('on conflict (id) do update set data = excluded.data, updated_at = now();');
lines.push('');

// --- product_offers --------------------------------------------------------
// delete+insert je geseedetem Material hält die Angebote synchron zum Seed
// (in Phase 12 gibt es noch keine Admin-Pflege, daher unkritisch).
const offerEntries = Object.entries(PRODUCT_OFFERS);
const offerMaterialIds = offerEntries.map(([id]) => str(id)).join(', ');
lines.push('-- product_offers');
lines.push(`delete from public.product_offers where material_id in (${offerMaterialIds});`);
const offerRows = offerEntries.flatMap(([materialId, offers]) =>
  offers.map(
    (o) =>
      `  (${str(materialId)}, ${str(o.merchantId)}, ${str(o.type)}, ${str(o.affiliateUrl)}, ${bool(o.active)}, ${str(o.checkedAt)})`
  )
);
lines.push(
  'insert into public.product_offers (material_id, merchant_id, type, affiliate_url, active, checked_at) values'
);
lines.push(offerRows.join(',\n') + ';');
lines.push('');
lines.push('commit;');
lines.push('');

writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(
  `0005_seed_catalog.sql geschrieben: ${WORK_STEPS.length} work_steps, ${MATERIAL_CATALOG.length} materials, ${offerRows.length} offers.`
);
