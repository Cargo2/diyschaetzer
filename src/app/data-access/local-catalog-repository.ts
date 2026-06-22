import { Injectable } from '@angular/core';
import {
  MATERIAL_CATALOG,
  WORK_STEPS
} from '../data/material-catalog-with-prices';
import { PRODUCT_OFFERS } from '../data/product-offers';
import type { CatalogData, CatalogRepository } from './catalog-repository';

/**
 * Offline-/Fallback-Adapter: liefert den gebündelten TS-Katalog. Identisch zum
 * DB-Seed (Migration 0005), daher liefert er denselben Stand, solange kein
 * Backend konfiguriert ist – und dient als Fallback, falls der DB-Ladevorgang scheitert.
 */
@Injectable()
export class LocalCatalogRepository implements CatalogRepository {
  async loadCatalog(): Promise<CatalogData> {
    return {
      materials: MATERIAL_CATALOG,
      workSteps: WORK_STEPS,
      offers: PRODUCT_OFFERS
    };
  }
}
