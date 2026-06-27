import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { MaterialCatalogItem } from '../../../data/material-catalog-with-prices';
import { SUPABASE_CLIENT } from '../../../data-access/supabase-client';
import type { AdminCatalogRepository, AdminMaterialOffer } from './admin-catalog-repository';

/**
 * Supabase-Adapter für Admin-Schreibzugriffe (Phase 15, Block 2). Schreibt das
 * volle Item zurück in die `materials.data`-jsonb-Spalte; die RLS-Policy
 * `materials_admin_update` (is_admin()) lässt das nur Admins durch.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAdminCatalogRepository implements AdminCatalogRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async updateMaterial(item: MaterialCatalogItem): Promise<void> {
    const client = this.requireClient();
    const { error } = await client
      .from('materials')
      .update({ data: item })
      .eq('id', item.id);
    if (error) {
      throw error;
    }
  }

  async replaceMaterialOffers(
    materialId: string,
    offers: AdminMaterialOffer[]
  ): Promise<void> {
    const client = this.requireClient();
    // Kompletten Satz je Material ersetzen: erst löschen, dann neu einfügen.
    const { error: deleteError } = await client
      .from('product_offers')
      .delete()
      .eq('material_id', materialId);
    if (deleteError) {
      throw deleteError;
    }
    if (offers.length === 0) {
      return;
    }
    const checkedAt = new Date().toISOString().slice(0, 10);
    const rows = offers.map((offer) => ({
      material_id: materialId,
      merchant_id: offer.merchantId,
      type: 'product' as const,
      affiliate_url: offer.affiliateUrl,
      active: true,
      checked_at: checkedAt
    }));
    const { error: insertError } = await client.from('product_offers').insert(rows);
    if (insertError) {
      throw insertError;
    }
  }
}
