import { InjectionToken } from '@angular/core';
import {
  MaterialCatalogItem,
  WorkStepDefinition
} from '../data/material-catalog-with-prices';
import { ProductOffer } from '../models/affiliate.model';
import { LocalCatalogRepository } from './local-catalog-repository';

/** Zusammenhängender Katalogstand, wie ihn das Frontend zur Laufzeit braucht. */
export interface CatalogData {
  materials: MaterialCatalogItem[];
  workSteps: WorkStepDefinition[];
  /** Affiliate-Angebote je Material-ID. */
  offers: Record<string, ProductOffer[]>;
}

/**
 * Persistenz-Grenze für den (öffentlichen) Produktkatalog (Phase 12, Rest).
 *
 * Ab dieser Phase ist die DB die Source of Truth; der gebündelte TS-Katalog ist
 * nur noch Seed und Offline-Fallback ({@link LocalCatalogRepository}). Das
 * Frontend lädt den Katalog **einmal** über dieses Interface und cached ihn
 * (siehe CatalogService) – die synchrone Berechnungs-Pipeline bleibt unangetastet.
 */
export interface CatalogRepository {
  loadCatalog(): Promise<CatalogData>;
}

/**
 * Default ist der offline-sichere TS-Adapter – so funktionieren Tests und der
 * Stand ohne Backend ohne weitere Konfiguration. Das produktive Wiring wählt in
 * `app.config.ts` je nach Supabase-Verfügbarkeit den DB-Adapter.
 */
export const CATALOG_REPOSITORY = new InjectionToken<CatalogRepository>('CATALOG_REPOSITORY', {
  providedIn: 'root',
  factory: () => new LocalCatalogRepository()
});
