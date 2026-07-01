import { Merchant } from '../models/affiliate.model';

/** rel-Standard für alle ausgehenden Affiliate-Links. */
export const AFFILIATE_LINK_REL = 'nofollow sponsored noopener';

/**
 * Shop-Registry. `enabled` ist der Schalter je Shop; der globale Schalter liegt
 * in COMMERCIAL_CONFIG.affiliateEnabled und wird zur Laufzeit über den
 * AffiliateSettingsService überschrieben.
 *
 * Amazon erfordert einen Partner-Tag (`tag=`) – hier Platzhalter, der vor dem
 * Livegang ersetzt wird.
 */
export const MERCHANTS: Merchant[] = [
  {
    id: 'obi',
    displayName: 'OBI',
    iconKey: 'obi',
    rel: AFFILIATE_LINK_REL,
    enabled: true,
    sponsored: true,
    searchUrlTemplate: 'https://www.obi.de/search/{q}'
  },
  {
    id: 'toom',
    displayName: 'toom',
    iconKey: 'toom',
    rel: AFFILIATE_LINK_REL,
    enabled: true,
    sponsored: true,
    searchUrlTemplate: 'https://www.toom.de/search/?text={q}'
  },
  {
    id: 'amazon',
    displayName: 'Amazon',
    iconKey: 'amazon',
    rel: AFFILIATE_LINK_REL,
    enabled: true,
    sponsored: true,
    searchUrlTemplate: 'https://www.amazon.de/s?k={q}&tag=alkoholvergle-21'
  }
];
