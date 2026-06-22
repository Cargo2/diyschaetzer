import { TestBed } from '@angular/core/testing';
import { CATALOG_REPOSITORY, CatalogData, CatalogRepository } from '../data-access/catalog-repository';
import { MATERIAL_CATALOG } from '../data/material-catalog-with-prices';
import { CatalogService } from './catalog.service';

class FakeCatalogRepository implements CatalogRepository {
  constructor(private readonly result: CatalogData | 'throw') {}
  async loadCatalog(): Promise<CatalogData> {
    if (this.result === 'throw') {
      throw new Error('backend offline');
    }
    return this.result;
  }
}

function setup(repo: CatalogRepository): CatalogService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: CATALOG_REPOSITORY, useValue: repo }]
  });
  return TestBed.inject(CatalogService);
}

describe('CatalogService', () => {
  it('serves the bundled catalog immediately and after a successful hydrate', async () => {
    const service = setup(
      new FakeCatalogRepository({
        materials: [{ id: 'only_one', name: 'Solo' } as never],
        workSteps: [{ id: 'priming', order: 5, label: 'Grundieren', description: 'd' } as never],
        offers: { only_one: [{ merchantId: 'obi', type: 'product', affiliateUrl: 'https://x', active: true, checkedAt: null }] }
      })
    );

    // Vor der Hydration steht bereits der gebündelte TS-Katalog bereit.
    expect(service.materials().length).toBe(MATERIAL_CATALOG.length);

    await service.ready;

    // Danach spiegelt der Cache die DB-Daten.
    expect(service.materials().map((m) => m.id)).toEqual(['only_one']);
    expect(service.materialById('only_one')?.name).toBe('Solo');
    expect(service.offersFor('only_one')).toHaveLength(1);
    expect(service.workSteps().map((s) => s.id)).toEqual(['priming']);
  });

  it('falls back to the bundled catalog when the repository fails', async () => {
    const service = setup(new FakeCatalogRepository('throw'));

    await service.ready;

    expect(service.materials().length).toBe(MATERIAL_CATALOG.length);
    expect(service.workSteps().length).toBeGreaterThan(0);
  });
});
