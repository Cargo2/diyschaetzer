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

  it('returns multiple resolved offers for a product when enabled', () => {
    settings.setGlobalEnabled(true);
    const offers = service.getOffersForMaterial('flexible_tile_adhesive');

    expect(offers.length).toBeGreaterThan(1);
    expect(offers.map((offer) => offer.merchantId)).toEqual(
      expect.arrayContaining(['obi', 'toom', 'amazon'])
    );
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

  it('generates a search link from the product name for search offers', () => {
    settings.setGlobalEnabled(true);
    // sanitary_silicone hat nur ein Amazon-Such-Angebot ohne Deeplink.
    const offers = service.getOffersForMaterial('sanitary_silicone');

    expect(offers).toHaveLength(1);
    expect(offers[0].type).toBe('search');
    expect(offers[0].url).toContain('amazon.de/s?k=');
    expect(offers[0].url).toContain('tag=');
  });

  it('returns an empty list for materials without offers', () => {
    settings.setGlobalEnabled(true);
    expect(service.getOffersForMaterial('unknown_material')).toEqual([]);
  });
});
