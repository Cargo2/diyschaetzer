import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UserProfile } from '../models/auth.model';
import { emptyCompanyProfile } from '../models/company-profile.model';
import { ExportDocumentData } from '../models/export-document.model';
import { AuthService } from './auth.service';
import { CompanyProfileService } from './company-profile.service';
import { ContractorBrandingService } from './contractor-branding.service';

function doc(): ExportDocumentData {
  return {
    documentType: 'material_list',
    title: 'Materialliste',
    subtitle: null,
    projectName: null,
    roomName: 'Bad',
    createdAt: new Date('2026-06-23').toISOString(),
    sections: [],
    totals: {},
    legalNotice: null
  };
}

function setup(opts: {
  profile: UserProfile | null;
  companyName?: string;
}): ContractorBrandingService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AuthService,
        useValue: { ready: Promise.resolve(), profile: signal(opts.profile) }
      },
      {
        provide: CompanyProfileService,
        useValue: {
          load: async () => ({
            ...emptyCompanyProfile(),
            companyName: opts.companyName ?? ''
          })
        }
      }
    ]
  });
  return TestBed.inject(ContractorBrandingService);
}

const contractor: UserProfile = {
  id: 'c-1',
  role: 'contractor',
  plan: 'pro',
  displayName: null
};
const customer: UserProfile = {
  id: 'h-1',
  role: 'customer',
  plan: 'free',
  displayName: null
};

describe('ContractorBrandingService', () => {
  it('brands the export with the company name for a contractor', async () => {
    const service = setup({ profile: contractor, companyName: 'Fliesen Müller' });
    await service.ready;

    expect(service.current()).toEqual({
      brandName: 'Fliesen Müller',
      logoUrl: null,
      primaryColor: null,
      supportEmail: null
    });
    expect(service.applyTo(doc()).branding?.brandName).toBe('Fliesen Müller');
  });

  it('leaves the export unbranded for a hobby user (customer)', async () => {
    const service = setup({ profile: customer, companyName: 'wird ignoriert' });
    await service.ready;

    expect(service.current()).toBeNull();
    expect(service.applyTo(doc()).branding).toBeUndefined();
  });

  it('leaves the export unbranded when the contractor has no company name', async () => {
    const service = setup({ profile: contractor, companyName: '   ' });
    await service.ready;

    expect(service.current()).toBeNull();
    expect(service.applyTo(doc()).branding).toBeUndefined();
  });

  it('treats anonymous users (no profile) as unbranded', async () => {
    const service = setup({ profile: null });
    await service.ready;

    expect(service.current()).toBeNull();
  });
});
