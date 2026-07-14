import { ContractorOffer, offerGrossTotal } from '../models/contractor-offer.model';
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

describe('ContractorInvoiceService.sellerFromProfile (Aufgabe X1: Verkäuferland)', () => {
  const service = new ContractorInvoiceService();

  it('defaults to DE when the profile has no countryCode (legacy)', () => {
    expect(service.sellerFromProfile(profile()).countryCode).toBe('DE');
  });

  it('normalizes a lowercase/whitespace countryCode', () => {
    expect(service.sellerFromProfile({ ...profile(), countryCode: ' at ' }).countryCode).toBe('AT');
  });

  it('passes through a non-German countryCode', () => {
    expect(service.sellerFromProfile({ ...profile(), countryCode: 'CH' }).countryCode).toBe('CH');
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

describe('ContractorInvoiceService.buildDepositInvoice', () => {
  const service = new ContractorInvoiceService();

  it('builds a single deposit line from a percentage of the gross total (19 % VAT)', () => {
    const offer = offerWithMixedLines(); // gross = 856.8 € (s.o.)
    expect(offerGrossTotal(offer)).toBeCloseTo(856.8, 2);

    const invoice = service.buildDepositInvoice(offer, profile(), [], 30);

    expect(invoice.sections).toHaveLength(1);
    expect(invoice.sections[0].kind).toBe('custom');
    expect(invoice.sections[0].lines).toHaveLength(1);
    const line = invoice.sections[0].lines[0];
    expect(line.quantity).toBe(1);
    expect(line.unit).toBe('pauschal');
    expect(line.isActive).toBe(true);

    // Brutto-Rückrechnung: 30 % von 856,80 € = 257,04 € brutto → 216,00 € netto (19 %).
    expect(line.unitPrice).toBeCloseTo(216, 2);
    expect(invoiceVatAmount(invoice)).toBeCloseTo(41.04, 2);
    // Rundungsfehler durch zwei Rundungsstufen (netto, dann MwSt.) bleiben ≤ 1 Cent.
    expect(Math.abs(invoiceGrossTotal(invoice) - 257.04)).toBeLessThanOrEqual(0.01);
  });

  it('nets equal gross at 0 % VAT', () => {
    const offer = { ...offerWithMixedLines(), vatPercent: 0, discountPercent: 0 };
    const invoice = service.buildDepositInvoice(offer, profile(), [], 30);

    const line = invoice.sections[0].lines[0];
    // 30 % von 800 € (netto = brutto bei 0 %) = 240 €, keine Bruttoumrechnung nötig.
    expect(line.unitPrice).toBeCloseTo(240, 2);
    expect(invoiceGrossTotal(invoice)).toBeCloseTo(line.unitPrice, 2);
    expect(invoice.vatPercent).toBe(0);
  });

  it('always forces discountPercent to 0, even if the offer had a discount', () => {
    const offer = offerWithMixedLines(); // discountPercent: 10
    const invoice = service.buildDepositInvoice(offer, profile(), [], 25);
    expect(invoice.discountPercent).toBe(0);
  });

  it('labels the deposit line with the percentage and the offer reference (number/label/project)', () => {
    const withNumber = service.buildDepositInvoice(
      { ...offerWithMixedLines(), offerNumber: '2026-042' },
      profile(),
      [],
      30
    );
    expect(withNumber.sections[0].lines[0].label).toContain('30');
    expect(withNumber.sections[0].lines[0].label).toContain('2026-042');

    // Ohne Angebotsnummer/-Bezeichnung fällt die Referenz auf den Projektnamen zurück.
    const withoutNumber = service.buildDepositInvoice(offerWithMixedLines(), profile(), [], 30);
    expect(withoutNumber.sections[0].lines[0].label).toContain('Sanierung Altbau');
  });

  it('sets vatPercent from the offer, an invoice number and a +14d due date', () => {
    const invoice = service.buildDepositInvoice(offerWithMixedLines(), profile(), [], 30);
    expect(invoice.vatPercent).toBe(19);
    expect(invoice.invoiceNumber).toMatch(/^RE-\d{4}-001$/);
    expect(invoice.serviceDate).toBe(invoice.invoiceDate);
    expect(invoice.dueDate > invoice.invoiceDate).toBe(true);
    expect(invoice.outroText).toContain('§ 14 Abs. 5 UStG');
    // Bestehender Angebots-Schlusstext bleibt erhalten (angehängt).
    expect(invoice.outroText).toContain('Zahlbar in 14 Tagen.');
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
