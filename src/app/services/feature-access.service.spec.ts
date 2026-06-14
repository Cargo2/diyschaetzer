import { TestBed } from '@angular/core/testing';
import { FeatureAccessService } from './feature-access.service';

describe('FeatureAccessService', () => {
  let service: FeatureAccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FeatureAccessService);
  });

  it('temporarily enables PDF export for the anonymous free context', () => {
    expect(service.canUsePdfExport()).toBe(true);
    expect(service.getPdfAccessHint()).toBe('');
  });

  it('allows PDF export for contractors on pro plans', () => {
    service.setUserContextForTesting({ role: 'contractor', plan: 'pro' });
    expect(service.canUsePdfExport()).toBe(true);
  });

  it('keeps the underlying premium feature rule available', () => {
    service.setUserContextForTesting({ role: 'customer', plan: 'enterprise' });
    expect(service.canUseFeature('pdf_export')).toBe(false);
    expect(service.canUsePdfExport()).toBe(true);
  });
});
