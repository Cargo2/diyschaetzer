import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONTRACTOR_INVOICE_REPOSITORY, ContractorInvoiceRepository } from '../../data-access/contractor-invoice-repository';
import { CONTRACTOR_OFFER_REPOSITORY } from '../../data-access/contractor-offer-repository';
import { ContractorInvoice, emptyInvoiceCustomer, emptyInvoiceSeller } from '../../models/contractor-invoice.model';
import { ContractorOffer, ContractorOfferLine } from '../../models/contractor-offer.model';
import { XRechnungExportService } from '../../services/xrechnung-export.service';
import { CompanyProfileService } from '../../services/company-profile.service';
import { SubscriptionStatusService } from '../../services/subscription-status.service';
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

/** Angebots-Repository-Stub (Live-Gruppenüberschrift; standardmäßig leer). */
function offerRepositoryStub(offers: ContractorOffer[] = []): unknown {
  return {
    listByProject: async () => offers,
    listMine: async () => offers,
    countMine: async () => offers.length,
    save: async () => {},
    delete: async () => {}
  };
}

function setup(
  profileOverride: Partial<CompanyProfile> = {},
  subscribed = true
): {
  component: ContractorInvoicesComponent;
  downloads: ContractorInvoice[];
  saved: ContractorInvoice[];
} {
  const downloads: ContractorInvoice[] = [];
  const saved: ContractorInvoice[] = [];
  const repository: ContractorInvoiceRepository = {
    listMine: async () => [],
    save: async (invoice: ContractorInvoice) => {
      saved.push(invoice);
    },
    delete: async () => {}
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ContractorInvoicesComponent],
    providers: [
      provideRouter([]),
      { provide: CONTRACTOR_INVOICE_REPOSITORY, useValue: repository },
      { provide: CONTRACTOR_OFFER_REPOSITORY, useValue: offerRepositoryStub() },
      {
        provide: SubscriptionStatusService,
        useValue: { isActive: signal(subscribed), ensureLoaded: async () => {} }
      },
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
  return { component, downloads, saved };
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

describe('ContractorInvoicesComponent – gruppierte Liste', () => {
  it('groups by offerId, keeps the "__none__" bucket last and sorts rows chronologically', () => {
    const { component } = setup();
    component.invoices.set([
      completeInvoice({ id: 'a2', offerId: 'o1', invoiceNumber: 'RE-2', invoiceDate: '2026-07-05' }),
      completeInvoice({ id: 'a1', offerId: 'o1', invoiceNumber: 'RE-1', invoiceDate: '2026-07-01' }),
      completeInvoice({ id: 'n1', offerId: null, invoiceNumber: 'RE-N', invoiceDate: '2026-08-01' })
    ]);
    const groups = component.groupedInvoices();
    expect(groups.length).toBe(2);
    // Gruppe mit Angebot zuerst, Sammelgruppe zuletzt.
    expect(groups[0].key).toBe('o1');
    expect(groups[1].isNone).toBe(true);
    // Zeilen chronologisch aufsteigend.
    expect(groups[0].invoices.map((i) => i.id)).toEqual(['a1', 'a2']);
  });

  it('computes an honest "Σ gestellt" without double-counting the final invoice', () => {
    const { component } = setup();
    // Anzahlung 1.000 € brutto (0 % USt) + Schlussrechnung 3.000 € brutto, davon 1.000 € angerechnet.
    const deposit = completeInvoice({
      id: 'd',
      offerId: 'o1',
      kind: 'deposit',
      vatPercent: 0,
      invoiceDate: '2026-07-01',
      sections: [{ id: 's', kind: 'custom', title: 'Anzahlung', lines: [line({ unitPrice: 1000 })] }]
    });
    const final = completeInvoice({
      id: 'f',
      offerId: 'o1',
      kind: 'final',
      vatPercent: 0,
      invoiceDate: '2026-07-20',
      sections: [{ id: 's', kind: 'custom', title: 'Leistungen', lines: [line({ unitPrice: 3000 })] }],
      settledPayments: [
        { invoiceId: 'd', invoiceNumber: 'RE-1', kind: 'deposit', invoiceDate: '2026-07-01', grossAmount: 1000, netAmount: 1000, vatAmount: 0 }
      ]
    });
    component.invoices.set([deposit, final]);
    const group = component.groupedInvoices()[0];
    // 1.000 (Anzahlung) + (3.000 − 1.000 Rest der Schlussrechnung) = 3.000.
    expect(group.billedTotal).toBe(3000);
  });

  it('derives the group paid state from the invoice statuses (all/some/none paid)', () => {
    const { component } = setup();
    component.invoices.set([
      completeInvoice({ id: 'a1', offerId: 'g1', status: 'paid' }),
      completeInvoice({ id: 'a2', offerId: 'g1', status: 'paid' }),
      completeInvoice({ id: 'b1', offerId: 'g2', status: 'sent' }),
      completeInvoice({ id: 'c1', offerId: 'g3', status: 'paid' }),
      completeInvoice({ id: 'c2', offerId: 'g3', status: 'draft' })
    ]);
    const byKey = new Map(component.groupedInvoices().map((g) => [g.key, g.paidState]));
    expect(byKey.get('g1')).toBe('paid');
    expect(byKey.get('g2')).toBe('open');
    expect(byKey.get('g3')).toBe('partial');
  });

  it('toggles the accordion so that only one group is expanded at a time', () => {
    const { component } = setup();
    expect(component.expandedGroupKey()).toBeNull();
    component.toggleGroup('o1');
    expect(component.expandedGroupKey()).toBe('o1');
    expect(component.isGroupExpanded('o1')).toBe(true);
    // Andere Gruppe öffnen → vorherige schließt automatisch (nur der Key wird ersetzt).
    component.toggleGroup('o2');
    expect(component.expandedGroupKey()).toBe('o2');
    expect(component.isGroupExpanded('o1')).toBe(false);
    // Erneuter Klick auf die offene Gruppe schließt sie.
    component.toggleGroup('o2');
    expect(component.expandedGroupKey()).toBeNull();
  });

  it('auto-expands the group of the invoice opened in the editor', () => {
    const { component } = setup();
    component.invoices.set([
      completeInvoice({ id: 'a', offerId: 'o1' }),
      completeInvoice({ id: 'b', offerId: 'o2' })
    ]);
    component.selectInvoice('b');
    expect(component.expandedGroupKey()).toBe('o2');
  });

  it('marks an invoice as paid by persisting a copy without mutating the list entry', async () => {
    const saved: ContractorInvoice[] = [];
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ContractorInvoicesComponent],
      providers: [
        provideRouter([]),
        {
          provide: CONTRACTOR_INVOICE_REPOSITORY,
          useValue: {
            listMine: async () => [],
            save: async (invoice: ContractorInvoice) => {
              saved.push(invoice);
            },
            delete: async () => {}
          }
        },
        { provide: CONTRACTOR_OFFER_REPOSITORY, useValue: offerRepositoryStub() },
        {
          provide: SubscriptionStatusService,
          useValue: { isActive: signal(true), ensureLoaded: async () => {} }
        },
        { provide: XRechnungExportService, useValue: { download: () => {} } },
        { provide: CompanyProfileService, useValue: { load: async () => emptyCompanyProfile() } }
      ]
    });
    const component = TestBed.createComponent(ContractorInvoicesComponent).componentInstance;
    const entry = completeInvoice({ id: 'x', status: 'sent' });
    component.invoices.set([entry]);

    await component.markPaid(entry);

    expect(saved.length).toBe(1);
    expect(saved[0].status).toBe('paid');
    // Der Listeneintrag selbst wurde nicht in-place mutiert.
    expect(entry.status).toBe('sent');
    expect(component.markingPaidId()).toBeNull();
  });
});

describe('ContractorInvoicesComponent – Bezahlt-Lock', () => {
  it('sperrt eine gespeicherte, bereits bezahlte Rechnung beim Öffnen', () => {
    const { component } = setup();
    component.invoices.set([completeInvoice({ id: 'p', status: 'paid' })]);
    component.selectInvoice('p');
    expect(component.paidLock()).toBe(true);
    expect(component.editable()).toBe(false);
  });

  it('sperrt eine nicht bezahlte Rechnung nicht (Lock aus)', () => {
    const { component } = setup();
    component.invoices.set([completeInvoice({ id: 'd', status: 'draft' })]);
    component.selectInvoice('d');
    expect(component.paidLock()).toBe(false);
    expect(component.editable()).toBe(true);
  });

  it('setzt den Bezahlt-Lock erst NACH dem Speichern (nicht schon bei Statuswahl)', async () => {
    const { component } = setup();
    // Statuswahl „Bezahlt" allein sperrt noch nicht (kein setWorking, kein save).
    component.invoice = completeInvoice({ status: 'paid' });
    expect(component.paidLock()).toBe(false);
    expect(component.editable()).toBe(true);
    await component.save();
    expect(component.paidLock()).toBe(true);
    expect(component.editable()).toBe(false);
  });

  it('editable kombiniert paidLock UND readOnly', () => {
    const { component } = setup(); // abonniert → readOnly false
    expect(component.readOnly()).toBe(false);
    expect(component.editable()).toBe(true);
    component.paidLock.set(true);
    expect(component.editable()).toBe(false);
  });
});

describe('ContractorInvoicesComponent – Bezahlt-markieren-Bestätigung', () => {
  it('durchläuft request → cancel → request → confirm und persistiert erst beim Bestätigen', async () => {
    const { component, saved } = setup();
    const entry = completeInvoice({ id: 'x', status: 'sent' });
    component.invoices.set([entry]);

    component.requestMarkPaid('x');
    expect(component.confirmingMarkPaidId).toBe('x');
    component.cancelMarkPaid();
    expect(component.confirmingMarkPaidId).toBeNull();
    // Ohne Bestätigung wurde nichts persistiert.
    expect(saved.length).toBe(0);

    component.requestMarkPaid('x');
    await component.markPaid(entry);
    expect(saved.length).toBe(1);
    expect(saved[0].status).toBe('paid');
    expect(component.confirmingMarkPaidId).toBeNull();
  });
});

describe('ContractorInvoicesComponent – Premium-Nur-Lese-Modus', () => {
  it('ist ohne aktives Abo schreibgeschützt (readOnly, editable false)', () => {
    const { component } = setup({}, false);
    expect(component.readOnly()).toBe(true);
    expect(component.editable()).toBe(false);
  });

  it('blockt save im Nur-Lese-Modus', async () => {
    const { component, saved } = setup({}, false);
    component.invoice = completeInvoice({ status: 'draft' });
    await component.save();
    expect(saved.length).toBe(0);
  });

  it('blockt markPaid im Nur-Lese-Modus', async () => {
    const { component, saved } = setup({}, false);
    const entry = completeInvoice({ id: 'x', status: 'sent' });
    component.invoices.set([entry]);
    await component.markPaid(entry);
    expect(saved.length).toBe(0);
  });
});

describe('ContractorInvoicesComponent – Live-Gruppenüberschrift', () => {
  it('folgt dem aktuellen Angebot (Treffer) und fällt sonst auf den Snapshot-Namen zurück', () => {
    const { component } = setup();
    component.invoices.set([
      completeInvoice({ id: 'i1', offerId: 'o1', projectName: 'Alt (eingefroren)' })
    ]);
    const group = component.groupedInvoices()[0];
    // Ohne Treffer in offersById: eingefrorener invoice.projectName.
    expect(component.groupHeader(group)).toBe('Alt (eingefroren)');
    // Mit Treffer: aktuelle Angebotsnummer + aktueller Projektname.
    const offer: ContractorOffer = {
      id: 'o1',
      projectId: 'p1',
      projectName: 'Neu (aktuell)',
      offerNumber: 'AN-2026-003',
      vatPercent: 19,
      sections: []
    };
    component.offersById.set(new Map([['o1', offer]]));
    expect(component.groupHeader(group)).toBe('AN-2026-003 · Neu (aktuell)');
  });
});
