import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  MaterialCatalogItem,
  WorkStepDefinition
} from '../data/material-catalog-with-prices';
import { ProductOffer } from '../models/affiliate.model';
import type { CatalogData, CatalogRepository } from './catalog-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/** Rohform einer `work_steps`-Zeile. */
interface WorkStepRow {
  id: string;
  order: number;
  label: string;
  description: string;
}

/** Rohform einer `materials`-Zeile (das volle Item liegt im jsonb-Blob). */
interface MaterialRow {
  data: MaterialCatalogItem;
}

/** Rohform einer `product_offers`-Zeile. */
interface OfferRow {
  material_id: string;
  merchant_id: string;
  type: ProductOffer['type'];
  affiliate_url: string | null;
  active: boolean;
  checked_at: string | null;
}

/**
 * Supabase-Adapter für den Produktkatalog (Phase 12, Rest). Lädt Materialien,
 * Arbeitsschritte und Angebote öffentlich lesbar (RLS: SELECT für alle) und
 * mappt zurück auf die Domänentypen.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseCatalogRepository implements CatalogRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async loadCatalog(): Promise<CatalogData> {
    const client = this.requireClient();
    const [materialsRes, stepsRes, offersRes] = await Promise.all([
      client.from('materials').select('data'),
      client.from('work_steps').select('*'),
      client.from('product_offers').select('*')
    ]);
    if (materialsRes.error) {
      throw materialsRes.error;
    }
    if (stepsRes.error) {
      throw stepsRes.error;
    }
    if (offersRes.error) {
      throw offersRes.error;
    }

    const materials = ((materialsRes.data ?? []) as MaterialRow[]).map((row) => row.data);
    // Nach `order` sortieren: das Frontend baut die Materiallisten-Sektionen in
    // Array-Reihenfolge; die DB liefert ohne explizite Sortierung unsortiert.
    const workSteps = ((stepsRes.data ?? []) as WorkStepRow[])
      .map(
        (row): WorkStepDefinition => ({
          id: row.id as WorkStepDefinition['id'],
          order: row.order,
          label: row.label,
          description: row.description
        })
      )
      .sort((a, b) => a.order - b.order);

    const offers: Record<string, ProductOffer[]> = {};
    for (const row of (offersRes.data ?? []) as OfferRow[]) {
      const offer: ProductOffer = {
        merchantId: row.merchant_id as ProductOffer['merchantId'],
        type: row.type,
        affiliateUrl: row.affiliate_url,
        active: row.active,
        checkedAt: row.checked_at
      };
      (offers[row.material_id] ??= []).push(offer);
    }

    return { materials, workSteps, offers };
  }
}
