/**
 * Affiliate-Datenmodell (Phase 8).
 *
 * Ein Produkt kann mehrere Angebote (ProductOffer) bei unterschiedlichen Shops
 * (Merchant) haben. Bewusst ohne Preis: Es werden nur Icons gerendert, die
 * herausverlinken – der interne Schätzpreis bleibt der einzige angezeigte Preis.
 *
 * Die echte `Product`-Tabelle folgt mit der Datenbank (Phase 10); bis dahin ist
 * der Materialschlüssel zugleich der Produktschlüssel.
 */

export type MerchantId = 'obi' | 'toom' | 'amazon';

export interface Merchant {
  id: MerchantId;
  /** Anzeigename, z. B. "OBI". */
  displayName: string;
  /** Schlüssel für das Icon-Asset (Auflösung in der UI, Phase 9). */
  iconKey: string;
  /** rel-Attribute für ausgehende Links. */
  rel: string;
  /** Schalter je Shop. */
  enabled: boolean;
  /** Erfordert sichtbare Werbe-/Sponsored-Kennzeichnung. */
  sponsored: boolean;
  /**
   * Vorlage für einen generierten Such-Link mit `{q}`-Platzhalter.
   * Kann den Affiliate-Tag bereits enthalten. Null = keine Such-Links.
   */
  searchUrlTemplate: string | null;
}

export type ProductOfferType = 'product' | 'search';

export interface ProductOffer {
  merchantId: MerchantId;
  /** 'product' = konkreter SKU-Deeplink, 'search' = generierter Such-Link. */
  type: ProductOfferType;
  /** Direkter (Affiliate-)Deeplink; bei 'search' null. */
  affiliateUrl: string | null;
  active: boolean;
  /** Datum der letzten Prüfung ("Stand"), ISO-String oder null. */
  checkedAt: string | null;
}

/** Fertig aufgelöstes Angebot für die Anzeige (Phase 9). */
export interface ResolvedOffer {
  merchantId: MerchantId;
  displayName: string;
  iconKey: string;
  rel: string;
  sponsored: boolean;
  type: ProductOfferType;
  /** Endgültige Ziel-URL (Deeplink oder generierter Such-Link). */
  url: string;
}
