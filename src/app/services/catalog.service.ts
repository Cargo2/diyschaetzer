import { inject, Injectable, signal } from '@angular/core';
import { CATALOG_REPOSITORY } from '../data-access/catalog-repository';
import {
  MATERIAL_CATALOG,
  MaterialCatalogItem,
  WORK_STEPS,
  WorkStepDefinition
} from '../data/material-catalog-with-prices';
import { PRODUCT_OFFERS } from '../data/product-offers';
import { ProductOffer } from '../models/affiliate.model';

/**
 * Hält den Produktkatalog im Speicher und entkoppelt so die **synchrone**
 * Berechnungs-Pipeline von der **asynchronen** DB (Phase 12, Rest).
 *
 * Der gebündelte TS-Katalog ist der Initialwert (erster Render blockiert nicht);
 * danach wird einmal über das {@link CATALOG_REPOSITORY} aus der DB hydratisiert.
 * Da der DB-Seed (Migration 0005) aus genau diesem TS-Katalog stammt, ist der
 * Stand identisch – es gibt also keinen sichtbaren Sprung. Schlägt das Laden fehl
 * (Backend offline), bleibt der gebündelte Stand aktiv.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly repository = inject(CATALOG_REPOSITORY);

  private readonly materialsSig = signal<MaterialCatalogItem[]>(MATERIAL_CATALOG);
  private readonly workStepsSig = signal<WorkStepDefinition[]>(WORK_STEPS);
  private readonly offersSig = signal<Record<string, ProductOffer[]>>(PRODUCT_OFFERS);

  /** Auflösbar, sobald der Katalog (aus DB oder Fallback) geladen ist. */
  readonly ready: Promise<void> = this.hydrate();

  /** Alle Katalogartikel. */
  materials(): MaterialCatalogItem[] {
    return this.materialsSig();
  }

  /** Alle Arbeitsschritte (nach `order` sortiert). */
  workSteps(): WorkStepDefinition[] {
    return this.workStepsSig();
  }

  /** Einzelner Artikel oder `undefined`. */
  materialById(materialId: string): MaterialCatalogItem | undefined {
    return this.materialsSig().find((item) => item.id === materialId);
  }

  /** Affiliate-Angebote eines Materials (leer, wenn keine hinterlegt sind). */
  offersFor(materialId: string): ProductOffer[] {
    return this.offersSig()[materialId] ?? [];
  }

  private async hydrate(): Promise<void> {
    try {
      const data = await this.repository.loadCatalog();
      // Leere Antworten ignorieren, damit ein Fehlstand den Katalog nicht leert.
      if (data.materials.length > 0) {
        this.materialsSig.set(data.materials);
      }
      if (data.workSteps.length > 0) {
        this.workStepsSig.set(data.workSteps);
      }
      this.offersSig.set(data.offers);
    } catch {
      // Gebündelter TS-Katalog bleibt als Fallback aktiv.
    }
  }
}
