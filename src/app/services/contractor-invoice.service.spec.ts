import { ContractorOffer } from '../models/contractor-offer.model';
import {
  InvoiceSellerSource,
  invoiceGrossTotal,
  invoiceNetTotal,
  invoiceVatAmount,
  invoiceDiscountAmount
} from '../models/contractor-invoice.model';
import { ContractorInvoiceService } from './contractor-invoice.service';

function offerWithMixedLines(): ContractorOffer {
  return {
    id: 'off-1',
    projectId: 'proj-1',
    projectName: 'Sanierung Altbau',
    vatPercent: 19,
    discountPercent: 10,
    outroText: 'Zahlbar in 14 Tagen.',
    customer: { name: 'Max Muster', address: 'Musterweg 3\n50667 Köln' },
    sections: [
      {
        id: 'site_setup',
        kind: 'site_setup',
        title: 'Baustelle einrichten',
        lines: [
          {
            id: 'site_setup:setup',
            label: 'Baustelle einrichten',
            description: '',
            quantity: 1,
            unit: 'pauschal',
            unitPrice: 200,
            isActive: true,
            isOptional: false,
            origin: 'generated'
          }
        ]
      },
      {
        id: 'room-1',
        kind: 'room',
        title: 'Badezimmer',
        lines: [
          {
            id: 'room-1:lay',
            label: 'Fliesen verlegen',
            description: '',
            quantity: 20,
            unit: 'm2',
            unitPrice: 30,
            isActive: true,
            isOptional: false,
            origin: 'generated'
          },
          {
            id: 'room-1:removal',
            label: 'Altbelag entfernen (Bedarf)',
            description: '',
            quantity: 20,
            unit: 'm2',
            unitPrice: 44,
            isActive: true,
            isOptional: true, // Bedarfsposition → raus
            origin: 'generated'
          },
          {
            id: 'room-1:disabled',
            label: 'Deaktivierte Position',
            description: '',
            quantity: 5,
            unit: 'piece',
            unitPrice: 10,
            isActive: false, // inaktiv → raus
            isOptional: false,
            origin: 'custom'
          }
        ]
      },
      {
        id: 'room-2',
        kind: 'room',
        title: 'Nur Bedarf',
        lines: [
          {
            id: 'room-2:opt',
            label: 'Optional',
            description: '',
            quantity: 1,
            unit: 'pauschal',
            unitPrice: 99,
            isActive: true,
            isOptional: true,
            origin: 'generated'
          }
        ]
      }
    ]
  };
}

function profile(): InvoiceSellerSource {
  return {
    companyName: 'Fliesen Meister GmbH',
    street: 'Handwerkerstr. 5',
    postalCode: '50667',
    city: 'Köln',
    vatId: 'DE123456789',
    iban: 'DE02120300000000202051',
    bic: 'BYLADEM1001',
    bankName: 'Test Bank'
  };
}

describe('ContractorInvoiceService.buildFromOffer', () => {
  const service = new ContractorInvoiceService();

  it('keeps only active mandatory lines and drops optional / inactive / empty groups', () => {
    const invoice = service.buildFromOffer(offerWithMixedLines(), profile(), []);

    // Baustelle + Badezimmer bleiben; „Nur Bedarf" (nur optionale Zeile) entfällt.
    expect(invoice.sections.map((s) => s.id)).toEqual(['site_setup', 'room-1']);
    const room = invoice.sections.find((s) => s.id === 'room-1')!;
    expect(room.lines.map((l) => l.id)).toEqual(['room-1:lay']);
  });

  it('re-derives totals consistently (net/discount/vat/gross), discount carried over', () => {
    const invoice = service.buildFromOffer(offerWithMixedLines(), profile(), []);

    // Netto = 200 (Baustelle) + 20*30 (Verlegen) = 800.
    expect(invoiceNetTotal(invoice)).toBe(800);
    expect(invoice.discountPercent).toBe(10);
    expect(invoiceDiscountAmount(invoice)).toBe(80); // 10 % von 800
    // MwSt. auf 720; Brutto 720 + 136.8 = 856.8.
    expect(invoiceVatAmount(invoice)).toBeCloseTo(136.8, 2);
    expect(invoiceGrossTotal(invoice)).toBeCloseTo(856.8, 2);
  });

  it('snapshots seller from profile and parses the customer address', () => {
    const invoice = service.buildFromOffer(offerWithMixedLines(), profile(), []);

    expect(invoice.seller.vatId).toBe('DE123456789');
    expect(invoice.seller.iban).toBe('DE02120300000000202051');
    expect(invoice.customer).toMatchObject({
      name: 'Max Muster',
      street: 'Musterweg 3',
      postalCode: '50667',
      city: 'Köln',
      countryCode: 'DE'
    });
  });

  it('sets an invoice number, invoice date and a +14d due date', () => {
    const invoice = service.buildFromOffer(offerWithMixedLines(), profile(), []);
    expect(invoice.invoiceNumber).toMatch(/^RE-\d{4}-001$/);
    expect(invoice.serviceDate).toBe(invoice.invoiceDate);
    expect(invoice.dueDate > invoice.invoiceDate).toBe(true);
  });
});

describe('ContractorInvoiceService.nextInvoiceNumber', () => {
  const service = new ContractorInvoiceService();

  it('starts at 001 for a year without invoices', () => {
    expect(service.nextInvoiceNumber([], 2026)).toBe('RE-2026-001');
  });

  it('increments the highest running number of the current year', () => {
    expect(
      service.nextInvoiceNumber(['RE-2026-001', 'RE-2026-002', 'RE-2025-050'], 2026)
    ).toBe('RE-2026-003');
  });

  it('ignores other years when computing the next number', () => {
    expect(service.nextInvoiceNumber(['RE-2025-099'], 2026)).toBe('RE-2026-001');
  });
});

describe('ContractorInvoiceService.isDuplicateNumberError', () => {
  const service = new ContractorInvoiceService();

  it('detects a Postgres unique violation by code', () => {
    expect(service.isDuplicateNumberError({ code: '23505', message: 'x' })).toBe(true);
  });

  it('detects a duplicate-key message', () => {
    expect(
      service.isDuplicateNumberError(new Error('duplicate key value violates unique constraint'))
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(service.isDuplicateNumberError(new Error('network down'))).toBe(false);
  });
});
