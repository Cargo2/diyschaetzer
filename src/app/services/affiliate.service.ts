import { inject, Injectable } from '@angular/core';
import { MERCHANTS } from '../config/affiliate.config';
import {
  Merchant,
  ProductOffer,
  ResolvedOffer
} from '../models/affiliate.model';
import { AffiliateSettingsService } from './affiliate-settings.service';
import { CatalogService } from './catalog.service';

/**
 * Einzige Schnittstelle für die Affiliate-Anzeige (Phase 9 liest nur hier).
 * Liefert die aktiven, freigeschalteten Angebote eines Materials als
 * anzeigefertige Offers – oder eine leere Liste, wenn Affiliate global bzw. für
 * den jeweiligen Shop deaktiviert ist.
 */
@Injectable({ providedIn: 'root' })
export class AffiliateService {
  private readonly settings = inject(AffiliateSettingsService);
  private readonly catalog = inject(CatalogService);
  private readonly merchantsById = new Map<string, Merchant>(
    MERCHANTS.map((merchant) => [merchant.id, merchant])
  );

  getOffersForMaterial(materialId: string): ResolvedOffer[] {
    if (!this.settings.isGlobalEnabled()) {
      return [];
    }

    const offers = this.catalog.offersFor(materialId);
    if (offers.length === 0) {
      return [];
    }

    const productName = this.productName(materialId);
    return offers
      .filter((offer) => offer.active && this.settings.isMerchantEnabled(offer.merchantId))
      .map((offer) => this.resolve(offer, productName))
      .filter((offer): offer is ResolvedOffer => offer !== null);
  }

  hasOffers(materialId: string): boolean {
    return this.getOffersForMaterial(materialId).length > 0;
  }

  private resolve(offer: ProductOffer, productName: string): ResolvedOffer | null {
    const merchant = this.merchantsById.get(offer.merchantId);
    if (!merchant) {
      return null;
    }

    const url = this.resolveUrl(offer, merchant, productName);
    if (!url) {
      return null;
    }

    return {
      merchantId: merchant.id,
      displayName: merchant.displayName,
      iconKey: merchant.iconKey,
      rel: merchant.rel,
      sponsored: merchant.sponsored,
      type: offer.type,
      url
    };
  }

  private resolveUrl(
    offer: ProductOffer,
    merchant: Merchant,
    productName: string
  ): string | null {
    if (offer.type === 'product' && offer.affiliateUrl) {
      return offer.affiliateUrl;
    }
    if (merchant.searchUrlTemplate && productName) {
      return merchant.searchUrlTemplate.replace(
        '{q}',
        encodeURIComponent(productName)
      );
    }
    // 'product' ohne URL oder 'search' ohne Vorlage: kein verwendbarer Link.
    return offer.affiliateUrl ?? null;
  }

  private productName(materialId: string): string {
    return this.catalog.materialById(materialId)?.name ?? '';
  }
}
