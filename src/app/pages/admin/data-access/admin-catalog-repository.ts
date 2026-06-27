import { inject, InjectionToken } from '@angular/core';
import { MaterialCatalogItem } from '../../../data/material-catalog-with-prices';
import { MerchantId } from '../../../models/affiliate.model';
import { SupabaseAdminCatalogRepository } from './supabase-admin-catalog-repository';

/** Ein vom Admin gepflegter Affiliate-Link (Direkt-Deeplink) je Händler. */
export interface AdminMaterialOffer {
  merchantId: MerchantId;
  affiliateUrl: string;
}

/**
 * Schreib-Grenze des Admin-Bereichs (Phase 15, Block 2). Bewusst getrennt von der
 * öffentlichen, read-only {@link CatalogRepository}: Admin-Schreibzugriff ist ein
 * eigener, abgekapselter Pfad (eigene RLS via is_admin(), eigene Service-Grenze).
 */
export interface AdminCatalogRepository {
  /** Aktualisiert einen bestehenden Materialartikel (volles Item als jsonb-Blob). */
  updateMaterial(item: MaterialCatalogItem): Promise<void>;
  /**
   * Ersetzt den kompletten Satz Affiliate-Angebote eines Materials (delete +
   * insert). Eine leere Liste entfernt alle Angebote des Materials.
   */
  replaceMaterialOffers(materialId: string, offers: AdminMaterialOffer[]): Promise<void>;
}

/**
 * Schreiben setzt ein konfiguriertes Supabase-Backend voraus (Admins sind immer
 * angemeldet); daher direkt der Supabase-Adapter. Ohne Backend wirft er beim
 * Aufruf – der Admin-Bereich ist dann ohnehin nicht erreichbar (Guard).
 */
export const ADMIN_CATALOG_REPOSITORY = new InjectionToken<AdminCatalogRepository>(
  'ADMIN_CATALOG_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(SupabaseAdminCatalogRepository)
  }
);
