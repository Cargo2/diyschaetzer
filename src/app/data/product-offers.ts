import { ProductOffer } from '../models/affiliate.model';

/**
 * Zuordnung Affiliate-Angebote -> Material/Produkt (Phase 8).
 *
 * Schlüssel ist die Material-ID aus MATERIAL_CATALOG (= Produktschlüssel bis zur
 * DB-Phase). Ein Eintrag kann mehrere Angebote verschiedener Shops enthalten.
 *
 * Die hier hinterlegten Deeplinks sind PLATZHALTER und müssen vor dem Livegang
 * durch echte Affiliate-URLs ersetzt werden. Einträge mit type 'search' brauchen
 * keine URL – der Such-Link wird aus dem Produktnamen generiert.
 */
export const PRODUCT_OFFERS: Record<string, ProductOffer[]> = {
  flexible_tile_adhesive: [
    {
      merchantId: 'obi',
      type: 'product',
      affiliateUrl: 'https://www.obi.de/p/PLACEHOLDER/flexkleber',
      active: true,
      checkedAt: '2026-06-14'
    },
    {
      merchantId: 'toom',
      type: 'product',
      affiliateUrl: 'https://www.toom.de/p/PLACEHOLDER/flexkleber',
      active: true,
      checkedAt: '2026-06-14'
    },
    {
      merchantId: 'amazon',
      type: 'search',
      affiliateUrl: null,
      active: true,
      checkedAt: null
    }
  ],
  cement_grout: [
    {
      merchantId: 'obi',
      type: 'product',
      affiliateUrl: 'https://www.obi.de/p/PLACEHOLDER/fugenmoertel',
      active: true,
      checkedAt: '2026-06-14'
    },
    {
      merchantId: 'amazon',
      type: 'search',
      affiliateUrl: null,
      active: true,
      checkedAt: null
    }
  ],
  primer: [
    {
      merchantId: 'toom',
      type: 'product',
      affiliateUrl: 'https://www.toom.de/p/PLACEHOLDER/grundierung',
      active: true,
      checkedAt: '2026-06-14'
    },
    {
      merchantId: 'amazon',
      type: 'search',
      affiliateUrl: null,
      active: true,
      checkedAt: null
    }
  ],
  sanitary_silicone: [
    {
      merchantId: 'amazon',
      type: 'search',
      affiliateUrl: null,
      active: true,
      checkedAt: null
    }
  ],
  leveling_compound: [
    {
      merchantId: 'obi',
      type: 'product',
      affiliateUrl: 'https://www.obi.de/p/PLACEHOLDER/ausgleichsmasse',
      active: true,
      checkedAt: '2026-06-14'
    }
  ]
};
