import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from './supabase-client';
import { SupabaseCatalogRepository } from './supabase-catalog-repository';

/** Fake-Client, der je Tabelle vorgegebene Zeilen liefert. */
function makeClient(tables: Record<string, unknown[]>) {
  return {
    from: (table: string) => ({
      select: async () => ({ data: tables[table] ?? [], error: null })
    })
  };
}

function setup(client: unknown): SupabaseCatalogRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(SupabaseCatalogRepository);
}

describe('SupabaseCatalogRepository', () => {
  it('maps materials from the jsonb blob, sorts work steps, groups offers', async () => {
    const repo = setup(
      makeClient({
        materials: [
          { data: { id: 'primer', name: 'Grundierung' } },
          { data: { id: 'cement_grout', name: 'Fugenmörtel' } }
        ],
        // bewusst unsortiert -> muss nach `order` sortiert zurückkommen
        work_steps: [
          { id: 'floor_tiling', order: 11, label: 'Boden', description: 'd2' },
          { id: 'priming', order: 5, label: 'Grundieren', description: 'd1' }
        ],
        product_offers: [
          { material_id: 'primer', merchant_id: 'toom', type: 'product', affiliate_url: 'https://x', active: true, checked_at: '2026-06-14' },
          { material_id: 'primer', merchant_id: 'amazon', type: 'search', affiliate_url: null, active: true, checked_at: null }
        ]
      })
    );

    const data = await repo.loadCatalog();

    expect(data.materials.map((m) => m.id)).toEqual(['primer', 'cement_grout']);
    expect(data.workSteps.map((s) => s.id)).toEqual(['priming', 'floor_tiling']);
    expect(data.offers['primer']).toHaveLength(2);
    expect(data.offers['primer'][0]).toEqual({
      merchantId: 'toom',
      type: 'product',
      affiliateUrl: 'https://x',
      active: true,
      checkedAt: '2026-06-14'
    });
  });

  it('throws when Supabase is not configured', async () => {
    const repo = setup(null);
    await expect(repo.loadCatalog()).rejects.toThrow();
  });
});
