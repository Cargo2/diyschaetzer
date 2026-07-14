import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONTRACTOR_INVOICE_REPOSITORY, ContractorInvoiceRepository } from '../../data-access/contractor-invoice-repository';
import { ContractorInvoice, emptyInvoiceCustomer, emptyInvoiceSeller } from '../../models/contractor-invoice.model';
import { ContractorOfferLine } from '../../models/contractor-offer.model';
import { XRechnungExportService } from '../../services/xrechnung-export.service';
import { CompanyProfileService } from '../../services/company-profile.service';
import { CompanyProfile, emptyCompanyProfile } from '../../models/company-profile.model';
import { ContractorInvoicesComponent } from './contractor-invoices.component';

function line(partial: Partial<ContractorOfferLine> = {}): ContractorOfferLine {
  return {
    id: 'l',
    label: 'Position',
    description: '',
    quantity: 1,
    unit: 'pauschal',
    unitPrice: 100,
    isActive: true,
    isOptional: false,
    origin: 'generated',
    ...partial
  };
}

function completeInvoice(overrides: Partial<ContractorInvoice> = {}): ContractorInvoice {
  return {
    id: 'inv-1',
    projectId: 'p1',
    offerId: 'o1',
    projectName: 'Sanierung',
    invoiceNumber: 'RE-2026-007',
    invoiceDate: '2026-07-11',
    serviceDate: '2026-07-10',
    servicePeriodStart: '',
    servicePeriodEnd: '',
    dueDate: '2026-07-25',
    buyerReference: 'n/a',
    status: 'draft',
    vatPercent: 19,
    discountPercent: 0,
    sections: [{ id: 's0', kind: 'custom', title: 'Leistungen', lines: [line()] }],
    customer: {
      ...emptyInvoiceCustomer(),
      name: 'Firma Kunde & Co. KG',
      street: 'Musterweg 3',
      postalCode: '50667',
      city: 'Köln',
      email: 'kunde@beispiel.de'
    },
    seller: {
      ...emptyInvoiceSeller(),
      companyName: 'Fliesen Meister GmbH',
      contactName: 'Max Mustermann',
      street: 'Handwerkerstr. 5',
      postalCode: '10115',
      city: 'Berlin',
      phone: '030 1234567',
      email: 'info@fliesenmeister.de',
      vatId: 'DE123456789',
      iban: 'DE02120300000000202051',
      bic: 'BYLADEM1001',
      bankName: 'Test Bank'
    },
    introText: '',
    outroText: '',
    ...overrides
  };
}

function stubRepository(): ContractorInvoiceRepository {
  return {
    listMine: async () => [],
    save: async () => {},
    delete: async () => {}
  };
}

function setup(
  profileOverride: Partial<CompanyProfile> = {}
): { component: ContractorInvoicesComponent; downloads: ContractorInvoice[] } {
  const downloads: ContractorInvoice[] = [];
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ContractorInvoicesComponent],
    providers: [
      provideRouter([]),
      { provide: CONTRACTOR_INVOICE_REPOSITORY, useValue: stubRepository() },
      {
        provide: XRechnungExportService,
        useValue: { download: (invoice: ContractorInvoice) => downloads.push(invoice) }
      },
      {
        provide: CompanyProfileService,
        useValue: {
          load: async () => ({ ...emptyCompanyProfile(), ...profileOverride })
        }
      }
    ]
  });
  const component = TestBed.createComponent(ContractorInvoicesComponent).componentInstance;
  return { component, downloads };
}

describe('ContractorInvoicesComponent – XRechnung-Pflichtfeld-Gating', () => {
  it('blocks the XRechnung download when no invoice is loaded', () => {
    const { component } = setup();
    component.invoice = null;
    expect(component.xrBlocked()).toBe(true);
  });

  it('does not block a fully filled invoice', () => {
    const { component } = setup();
    component.invoice = completeInvoice();
    expect(component.xrBlocked()).toBe(false);
    expect(component.xrMissingFields()).toEqual([]);
  });

  it('blocks and reports a missing IBAN', () => {
    const { component } = setup();
    component.invoice = completeInvoice({ seller: { ...completeInvoice().seller, iban: '' } });
    expect(component.xrBlocked()).toBe(true);
    expect(component.xrMissingFields()).toContain('IBAN');
    expect(component.xrSellerIncomplete()).toBe(true);
  });

  it('flags a missing service date when neither date nor period is set', () => {
    const { component } = setup();
    component.invoice = completeInvoice({ serviceDate: '', servicePeriodStart: '', servicePeriodEnd: '' });
    expect(component.xrServiceDateMissing()).toBe(true);
  });

  it('does not call XRechnungExportService.download when blocked', () => {
    const { component, downloads } = setup();
    component.invoice = completeInvoice({ seller: { ...completeInvoice().seller, iban: '' } });
    component.downloadXml();
    expect(downloads.length).toBe(0);
  });

  it('calls XRechnungExportService.download for a fully filled invoice', () => {
    const { component, downloads } = setup();
    component.invoice = completeInvoice();
    component.downloadXml();
    expect(downloads.length).toBe(1);
    expect(downloads[0].invoiceNumber).toBe('RE-2026-007');
  });
});

describe('ContractorInvoicesComponent – Firmendaten aus Profil aktualisieren', () => {
  it('refills the seller snapshot from the current company profile and clears the block', async () => {
    const { component } = setup({
      companyName: 'Fliesen Meister GmbH',
      street: 'Handwerkerstr. 5',
      postalCode: '10115',
      city: 'Berlin',
      phone: '030 1234567',
      email: 'info@fliesenmeister.de',
      vatId: 'DE123456789',
      iban: 'DE02120300000000202051'
    });
    // Bestehende Rechnung mit veraltetem Snapshot (IBAN fehlt) – die Sackgasse aus dem Bug.
    component.invoice = completeInvoice({ seller: { ...completeInvoice().seller, iban: '' } });
    expect(component.xrSellerIncomplete()).toBe(true);

    await component.refreshSellerFromProfile();

    expect(component.invoice!.seller.iban).toBe('DE02120300000000202051');
    expect(component.xrSellerIncomplete()).toBe(false);
    expect(component.refreshingSeller()).toBe(false);
  });

  it('does nothing when no invoice is loaded', async () => {
    const { component } = setup({ iban: 'DE02120300000000202051' });
    component.invoice = null;
    await component.refreshSellerFromProfile();
    expect(component.invoice).toBeNull();
  });
});
