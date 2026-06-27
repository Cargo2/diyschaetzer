import { TestBed } from '@angular/core/testing';
import { AffiliateService } from './affiliate.service';
import { AffiliateSettingsService } from './affiliate-settings.service';

describe('AffiliateService', () => {
  let service: AffiliateService;
  let settings: AffiliateSettingsService;

  beforeEach(() => {
    globalThis.localStorage?.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AffiliateService);
    settings = TestBed.inject(AffiliateSettingsService);
  });

  it('returns no offers while affiliate is globally disabled', () => {
    settings.setGlobalEnabled(false);
    expect(service.getOffersForMaterial('flexible_tile_adhesive')).toEqual([]);
  });

  it('returns resolved offers only for merchants with a maintained affiliate link', () => {
    settings.setGlobalEnabled(true);
    const offers = service.getOffersForMaterial('flexible_tile_adhesive');
    const merchantIds = offers.map((offer) => offer.merchantId);

    // obi + toom haben hinterlegte Deeplinks; amazon ist nur ein Such-Angebot
    // ohne Link → es erscheint bewusst kein Icon mehr.
    expect(merchantIds).toEqual(expect.arrayContaining(['obi', 'toom']));
    expect(merchantIds).not.toContain('amazon');
    for (const offer of offers) {
      expect(offer.rel).toContain('nofollow');
      expect(offer.rel).toContain('sponsored');
      expect(offer.url).toBeTruthy();
    }
  });

  it('filters out offers from a disabled merchant', () => {
    settings.setGlobalEnabled(true);
    settings.setMerchantEnabled('amazon', false);

    const merchants = service
      .getOffersForMaterial('flexible_tile_adhesive')
      .map((offer) => offer.merchantId);

    expect(merchants).not.toContain('amazon');
    expect(merchants).toContain('obi');
  });

  it('omits merchants without a maintained affiliate link (no generated search links)', () => {
    settings.setGlobalEnabled(true);
    // sanitary_silicone hat nur ein Amazon-Such-Angebot ohne Deeplink → kein Icon,
    // es wird kein Such-Link mehr generiert.
    expect(service.getOffersForMaterial('sanitary_silicone')).toEqual([]);
  });

  it('returns an empty list for materials without offers', () => {
    settings.setGlobalEnabled(true);
    expect(service.getOffersForMaterial('unknown_material')).toEqual([]);
  });
});
